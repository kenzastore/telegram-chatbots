import os
from datetime import datetime
from google.oauth2 import service_account
from googleapiclient.discovery import build

def export_data_to_sheets(
    credentials_file: str,
    transactions: list,
    weekly_summary: list,
    monthly_summary: list,
    spreadsheet_id: str = None
) -> str:
    """Exports transaction history and summaries to a Google Spreadsheet.

    Authenticates using the Google Service Account credentials file. If
    spreadsheet_id is provided, updates that existing sheet. Otherwise,
    creates a new sheet and shares it with 'anyone with link' (role=reader).

    Args:
        credentials_file: Path to Google Service Account credentials JSON file.
        transactions: List of transaction dicts to write.
        weekly_summary: List of weekly summary dicts to write.
        monthly_summary: List of monthly summary dicts to write.
        spreadsheet_id: Optional ID of an existing spreadsheet.

    Returns:
        The URL of the Google Spreadsheet.

    Raises:
        ValueError: If credentials_file is not configured.
        FileNotFoundError: If credentials_file does not exist.
    """
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
    
    # 1. Create a new Spreadsheet with two tabs if not provided
    if not spreadsheet_id:
        is_new = True
        spreadsheet_body = {
            'properties': {
                'title': f'Finance Bot Export - {today_str}'
            },
            'sheets': [
                {
                    'properties': {
                        'title': 'Transactions'
                    }
                },
                {
                    'properties': {
                        'title': 'Summaries'
                    }
                }
            ]
        }
        
        spreadsheet = sheets_service.spreadsheets().create(
            body=spreadsheet_body,
            fields='spreadsheetId,spreadsheetUrl'
        ).execute()
        
        spreadsheet_id = spreadsheet.get('spreadsheetId')
        spreadsheet_url = spreadsheet.get('spreadsheetUrl')
    else:
        spreadsheet_url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}"
        
    # 2. Format and write Transactions sheet data
    tx_rows = [["ID", "Date", "Amount", "Description", "Type", "Balance After"]]
    for tx in transactions:
        tx_rows.append([
            tx.get("id"),
            tx.get("date"),
            tx.get("amount"),
            tx.get("description"),
            tx.get("type"),
            tx.get("balance_after")
        ])
        
    # 3. Format and write Summaries sheet data
    summary_rows = []
    summary_rows.append(["Weekly Summary (Last 7 Days)"])
    summary_rows.append(["Description", "Type", "Total"])
    for s in weekly_summary:
        summary_rows.append([
            s.get("description"), s.get("type"), s.get("total")
        ])
        
    summary_rows.append([]) # Empty separator row
    summary_rows.append(["Monthly Summary (Last 30 Days)"])
    summary_rows.append(["Description", "Type", "Total"])
    for s in monthly_summary:
        summary_rows.append([
            s.get("description"), s.get("type"), s.get("total")
        ])
        
    # Write to Transactions tab
    sheets_service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range="Transactions!A1",
        valueInputOption="USER_ENTERED",
        body={"values": tx_rows}
    ).execute()
    
    # Write to Summaries tab
    sheets_service.spreadsheets().values().update(
        spreadsheetId=spreadsheet_id,
        range="Summaries!A1",
        valueInputOption="USER_ENTERED",
        body={"values": summary_rows}
    ).execute()
    
    # 4. Set sharing permission to "anyone with the link can view" (only for new spreadsheets)
    if is_new:
        drive_service.permissions().create(
            fileId=spreadsheet_id,
            body={
                'role': 'reader',
                'type': 'anyone'
            }
        ).execute()
    
    return spreadsheet_url
