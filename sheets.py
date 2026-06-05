import os
from datetime import datetime
from google.oauth2 import service_account
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

def get_authorization_url() -> tuple:
    """Generates a Google OAuth2 authorization URL and returns it along with state and code_verifier."""
    import config
    client_config = {
        "web": {
            "client_id": config.GOOGLE_CLIENT_ID,
            "client_secret": config.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
        }
    }
    redirect_uri = "urn:ietf:wg:oauth:2.0:oob"
    flow = Flow.from_client_config(
        client_config,
        scopes=[
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/userinfo.email'
        ],
        redirect_uri=redirect_uri
    )
    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true'
    )
    return authorization_url, state, flow.code_verifier


def exchange_code_for_credentials(auth_code: str, code_verifier: str = None) -> str:
    """Exchanges an authorization code for credentials (JSON string)."""
    import config
    import json
    import base64
    client_config = {
        "web": {
            "client_id": config.GOOGLE_CLIENT_ID,
            "client_secret": config.GOOGLE_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs"
        }
    }
    redirect_uri = "urn:ietf:wg:oauth:2.0:oob"
    flow = Flow.from_client_config(
        client_config,
        scopes=[
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/userinfo.email'
        ],
        redirect_uri=redirect_uri
    )
    flow.fetch_token(code=auth_code, code_verifier=code_verifier)
    creds = flow.credentials
    creds_json = creds.to_json()
    
    # Try to extract the email from the id_token
    email = ""
    if hasattr(creds, "id_token") and creds.id_token:
        try:
            parts = creds.id_token.split('.')
            if len(parts) >= 2:
                payload_b64 = parts[1]
                payload_b64 += '=' * (4 - len(payload_b64) % 4)
                payload = json.loads(base64.b64decode(payload_b64).decode('utf-8'))
                email = payload.get("email", "")
        except Exception:
            pass
            
    try:
        creds_dict = json.loads(creds_json)
        creds_dict["google_email"] = email
        creds_json = json.dumps(creds_dict)
    except Exception:
        pass
        
    return creds_json

def get_user_sheets_service(user_credentials_str: str):
    """Instantiates the Google Sheets service using serialized user credentials."""
    import json
    creds_info = json.loads(user_credentials_str)
    creds = Credentials.from_authorized_user_info(creds_info)
    return build('sheets', 'v4', credentials=creds)

def get_user_drive_service(user_credentials_str: str):
    """Instantiates the Google Drive service using serialized user credentials."""
    import json
    creds_info = json.loads(user_credentials_str)
    creds = Credentials.from_authorized_user_info(creds_info)
    return build('drive', 'v3', credentials=creds)


def export_data_to_sheets(
    credentials_file: str,
    transactions: list,
    weekly_summary: list,
    monthly_summary: list,
    spreadsheet_id: str = None,
    user_credentials_str: str = None
) -> str:
    """Exports transaction history and summaries to a Google Spreadsheet.

    Authenticates using the Google Service Account credentials file or user OAuth2 credentials.
    If spreadsheet_id is provided, updates that existing sheet. Otherwise,
    creates a new sheet.

    Args:
        credentials_file: Path to Google Service Account credentials JSON file.
        transactions: List of transaction dicts to write.
        weekly_summary: List of weekly summary dicts to write.
        monthly_summary: List of monthly summary dicts to write.
        spreadsheet_id: Optional ID of an existing spreadsheet.
        user_credentials_str: Optional JSON serialized user OAuth2 credentials.

    Returns:
        The URL of the Google Spreadsheet.

    Raises:
        ValueError: If credentials_file is not configured (when user_credentials_str is not provided).
        FileNotFoundError: If credentials_file does not exist (when user_credentials_str is not provided).
    """
    if user_credentials_str:
        import json
        creds_info = json.loads(user_credentials_str)
        creds = Credentials.from_authorized_user_info(creds_info)
    else:
        if not credentials_file:
            raise ValueError(
                "Google Service Account credentials file path is not configured."
            )
        if not os.path.exists(credentials_file):
            raise FileNotFoundError(
                f"Google Service Account credentials file not found at: "
                f"{credentials_file}"
            )

        creds = service_account.Credentials.from_service_account_file(
            credentials_file,
            scopes=[
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive.file'
            ]
        )
    
    # Initialize the APIs
    sheets_service = build('sheets', 'v4', credentials=creds)
    drive_service = build('drive', 'v3', credentials=creds)
    
    today_str = datetime.now().strftime("%Y-%m-%d")
    is_new = False
    
    if not spreadsheet_id:
        is_new = True
        title = 'Savings & Transaction Bot Export' if user_credentials_str else f'Finance Bot Export - {today_str}'
        spreadsheet_body = {
            'properties': {
                'title': title
            }
        }
        spreadsheet = sheets_service.spreadsheets().create(
            body=spreadsheet_body,
            fields='spreadsheetId,spreadsheetUrl'
        ).execute()
        spreadsheet_id = spreadsheet.get('spreadsheetId')
        spreadsheet_url = spreadsheet.get('spreadsheetUrl')
        existing_titles = []
    else:
        spreadsheet_url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}"
        spreadsheet = sheets_service.spreadsheets().get(
            spreadsheetId=spreadsheet_id,
            fields='sheets.properties.title'
        ).execute()
        existing_titles = [
            s['properties']['title'] for s in spreadsheet.get('sheets', [])
        ]
        
    # Group transactions by calendar month (YYYY-MM)
    from collections import defaultdict
    monthly_groups = defaultdict(list)
    for tx in transactions:
        tx_date = tx.get("date", today_str)
        month_key = tx_date[:7]  # YYYY-MM
        monthly_groups[month_key].append(tx)
        
    # If there are no transactions, we default to the current calendar month
    if not monthly_groups:
        monthly_groups[today_str[:7]] = []
        
    # Create missing worksheets dynamically
    requests = []
    for month_key in sorted(monthly_groups.keys()):
        tx_tab = f"{month_key} Transactions"
        sum_tab = f"{month_key} Summaries"
        if tx_tab not in existing_titles:
            requests.append({'addSheet': {'properties': {'title': tx_tab}}})
        if sum_tab not in existing_titles:
            requests.append({'addSheet': {'properties': {'title': sum_tab}}})
            
    if requests:
        sheets_service.spreadsheets().batchUpdate(
            spreadsheetId=spreadsheet_id,
            body={'requests': requests}
        ).execute()
        
    # Write transactions and monthly summaries for each month
    for month_key, tx_list in monthly_groups.items():
        tx_tab = f"{month_key} Transactions"
        sum_tab = f"{month_key} Summaries"
        
        # 1. Format transaction data for this month
        tx_rows = [["ID", "Date", "Amount", "Description", "Type", "Balance After"]]
        for tx in tx_list:
            tx_rows.append([
                tx.get("id"),
                tx.get("date"),
                tx.get("amount"),
                tx.get("description"),
                tx.get("type"),
                tx.get("balance_after")
            ])
            
        # 2. Format and calculate monthly summary data for this month
        summary_rows = [
            [f"Monthly Summary ({month_key})"],
            ["Description", "Type", "Total"]
        ]
        sums = {}
        for tx in tx_list:
            key = (tx.get("description"), tx.get("type"))
            sums[key] = sums.get(key, 0.0) + tx.get("amount", 0.0)
        for (desc, t_type), total in sorted(sums.items()):
            summary_rows.append([desc, t_type, total])
            
        # Clear existing content in both tabs to ensure no leftover rows when dataset shrinks or is cleared
        sheets_service.spreadsheets().values().clear(
            spreadsheetId=spreadsheet_id,
            range=tx_tab,
            body={}
        ).execute()
        
        sheets_service.spreadsheets().values().clear(
            spreadsheetId=spreadsheet_id,
            range=sum_tab,
            body={}
        ).execute()

        # Write to month-specific Transactions tab
        sheets_service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=f"{tx_tab}!A1",
            valueInputOption="USER_ENTERED",
            body={"values": tx_rows}
        ).execute()
        
        # Write to month-specific Summaries tab
        sheets_service.spreadsheets().values().update(
            spreadsheetId=spreadsheet_id,
            range=f"{sum_tab}!A1",
            valueInputOption="USER_ENTERED",
            body={"values": summary_rows}
        ).execute()
        
    # 4. Set sharing permission to "anyone with the link can view" (only for new spreadsheets and not using user credentials)
    if is_new and not user_credentials_str:
        drive_service.permissions().create(
            fileId=spreadsheet_id,
            body={
                'role': 'reader',
                'type': 'anyone'
            }
        ).execute()
        
    return spreadsheet_url
