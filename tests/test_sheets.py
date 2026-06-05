import pytest
import os
from unittest.mock import MagicMock, patch
import sheets

def test_export_data_to_sheets_missing_creds():
    with pytest.raises(ValueError, match="Google Service Account credentials file path is not configured."):
        sheets.export_data_to_sheets(None, [], [], [])

def test_export_data_to_sheets_file_not_found():
    with pytest.raises(FileNotFoundError, match="Google Service Account credentials file not found"):
        sheets.export_data_to_sheets("nonexistent_file.json", [], [], [])

@patch("sheets.service_account.Credentials.from_service_account_file")
@patch("sheets.build")
@patch("os.path.exists")
def test_export_data_to_sheets_success(mock_exists, mock_build, mock_from_file):
    mock_exists.return_value = True
    
    # Mock Sheets service
    mock_sheets = MagicMock()
    mock_spreadsheets = MagicMock()
    mock_values = MagicMock()
    
    mock_sheets.spreadsheets.return_value = mock_spreadsheets
    mock_spreadsheets.values.return_value = mock_values
    
    # Mock spreadsheet creation response
    mock_spreadsheets.create.return_value.execute.return_value = {
        "spreadsheetId": "test_sheet_id_123",
        "spreadsheetUrl": "https://docs.google.com/spreadsheets/d/test_sheet_id_123"
    }
    
    # Mock Drive service
    mock_drive = MagicMock()
    mock_permissions = MagicMock()
    mock_drive.permissions.return_value = mock_permissions
    
    def side_effect(serviceName, version, **kwargs):
        if serviceName == "sheets":
            return mock_sheets
        elif serviceName == "drive":
            return mock_drive
        return MagicMock()
        
    mock_build.side_effect = side_effect
    
    transactions = [
        {"id": 1, "date": "2026-06-04", "amount": 100.0, "description": "Salary", "type": "credit", "balance_after": 100.0}
    ]
    weekly = [
        {"description": "Groceries", "type": "debit", "total": 50.0}
    ]
    monthly = [
        {"description": "Salary", "type": "credit", "total": 100.0}
    ]
    
    url = sheets.export_data_to_sheets("credentials.json", transactions, weekly, monthly)
    
    assert url == "https://docs.google.com/spreadsheets/d/test_sheet_id_123"
    
    # Verify spreadsheet creation was called
    mock_spreadsheets.create.assert_called_once()
    
    # Verify values clear and update was called twice (once for Transactions, once for Summaries)
    assert mock_values.clear.call_count == 2
    assert mock_values.update.call_count == 2
    
    # Verify permissions create was called to share the sheet
    mock_permissions.create.assert_called_once_with(
        fileId="test_sheet_id_123",
        body={"role": "reader", "type": "anyone"}
    )


@patch("sheets.service_account.Credentials.from_service_account_file")
@patch("sheets.build")
@patch("os.path.exists")
def test_export_data_to_sheets_existing(mock_exists, mock_build, mock_from_file):
    mock_exists.return_value = True

    # Mock Sheets service
    mock_sheets = MagicMock()
    mock_spreadsheets = MagicMock()
    mock_values = MagicMock()

    mock_sheets.spreadsheets.return_value = mock_spreadsheets
    mock_spreadsheets.values.return_value = mock_values

    # Mock sheets.get list
    mock_spreadsheets.get.return_value.execute.return_value = {
        "sheets": [
            {"properties": {"title": "Sheet1"}}
        ]
    }

    # Mock Drive service
    mock_drive = MagicMock()
    mock_permissions = MagicMock()
    mock_drive.permissions.return_value = mock_permissions

    def side_effect(serviceName, version, **kwargs):
        if serviceName == "sheets":
            return mock_sheets
        elif serviceName == "drive":
            return mock_drive
        return MagicMock()

    mock_build.side_effect = side_effect

    transactions = [
        {"id": 1, "date": "2026-06-04", "amount": 100.0, "description": "Salary", "type": "credit", "balance_after": 100.0}
    ]
    weekly = []
    monthly = []

    url = sheets.export_data_to_sheets(
        "credentials.json", transactions, weekly, monthly, "existing_sheet_id_456"
    )

    assert url == "https://docs.google.com/spreadsheets/d/existing_sheet_id_456"

    # Verify spreadsheet creation was NOT called
    mock_spreadsheets.create.assert_not_called()

    # Verify values clear and update was called twice
    assert mock_values.clear.call_count == 2
    assert mock_values.update.call_count == 2

    # Verify values update was called with the existing sheet id
    mock_values.update.assert_any_call(
        spreadsheetId="existing_sheet_id_456",
        range="2026-06 Transactions!A1",
        valueInputOption="USER_ENTERED",
        body={"values": [["ID", "Date", "Amount", "Description", "Type", "Balance After"], [1, "2026-06-04", 100.0, "Salary", "credit", 100.0]]}
    )

    # Verify permissions create (sharing) was NOT called
    mock_permissions.create.assert_not_called()


@patch("sheets.service_account.Credentials.from_service_account_file")
@patch("sheets.build")
@patch("os.path.exists")
def test_export_data_to_sheets_monthly_tabs(mock_exists, mock_build, mock_from_file):
    mock_exists.return_value = True

    # Mock Sheets service
    mock_sheets = MagicMock()
    mock_spreadsheets = MagicMock()
    mock_values = MagicMock()
    mock_batch = MagicMock()

    mock_sheets.spreadsheets.return_value = mock_spreadsheets
    mock_spreadsheets.values.return_value = mock_values
    mock_spreadsheets.batchUpdate.return_value = mock_batch

    # Mock sheets.get list
    mock_spreadsheets.get.return_value.execute.return_value = {
        "sheets": [
            {"properties": {"title": "Sheet1"}}
        ]
    }

    # Mock Drive service
    mock_drive = MagicMock()
    mock_permissions = MagicMock()
    mock_drive.permissions.return_value = mock_permissions

    def side_effect(serviceName, version, **kwargs):
        if serviceName == "sheets":
            return mock_sheets
        elif serviceName == "drive":
            return mock_drive
        return MagicMock()

    mock_build.side_effect = side_effect

    # Transactions from May and June
    transactions = [
        {"id": 1, "date": "2026-05-15", "amount": 100.0, "description": "Salary", "type": "credit", "balance_after": 100.0},
        {"id": 2, "date": "2026-06-02", "amount": 50.0, "description": "Groceries", "type": "debit", "balance_after": 50.0}
    ]
    weekly = []
    monthly = []

    url = sheets.export_data_to_sheets(
        "credentials.json", transactions, weekly, monthly, "existing_sheet_id_456"
    )

    assert url == "https://docs.google.com/spreadsheets/d/existing_sheet_id_456"

    # Verify that spreadsheets.get was called to fetch sheets list
    mock_spreadsheets.get.assert_called_once_with(
        spreadsheetId="existing_sheet_id_456",
        fields="sheets.properties.title"
    )

    # Verify batchUpdate was called to add sheets for 2026-05 and 2026-06
    mock_spreadsheets.batchUpdate.assert_called_once()
    kwargs = mock_spreadsheets.batchUpdate.call_args[1]
    body = kwargs["body"]
    assert len(body["requests"]) == 4  # 2026-05 Tx/Sum + 2026-06 Tx/Sum
    titles = [req["addSheet"]["properties"]["title"] for req in body["requests"]]
    assert "2026-05 Transactions" in titles
    assert "2026-05 Summaries" in titles
    assert "2026-06 Transactions" in titles
    assert "2026-06 Summaries" in titles

    # Verify values clear and update was called 4 times (2 Tx tabs, 2 Summaries tabs)
    assert mock_values.clear.call_count == 4
    assert mock_values.update.call_count == 4

    # Verify the specific ranges for May and June updates
    mock_values.update.assert_any_call(
        spreadsheetId="existing_sheet_id_456",
        range="2026-05 Transactions!A1",
        valueInputOption="USER_ENTERED",
        body={"values": [["ID", "Date", "Amount", "Description", "Type", "Balance After"], [1, "2026-05-15", 100.0, "Salary", "credit", 100.0]]}
    )
    mock_values.update.assert_any_call(
        spreadsheetId="existing_sheet_id_456",
        range="2026-06 Transactions!A1",
        valueInputOption="USER_ENTERED",
        body={"values": [["ID", "Date", "Amount", "Description", "Type", "Balance After"], [2, "2026-06-02", 50.0, "Groceries", "debit", 50.0]]}
    )
    mock_values.update.assert_any_call(
        spreadsheetId="existing_sheet_id_456",
        range="2026-05 Summaries!A1",
        valueInputOption="USER_ENTERED",
        body={"values": [["Monthly Summary (2026-05)"], ["Description", "Type", "Total"], ["Salary", "credit", 100.0]]}
    )


@patch("sheets.Flow.from_client_config")
def test_get_authorization_url(mock_from_client_config):
    mock_flow = MagicMock()
    mock_flow.authorization_url.return_value = ("https://accounts.google.com/o/oauth2/auth?xyz", "state123")
    mock_flow.code_verifier = "verifier123"
    mock_from_client_config.return_value = mock_flow

    url, state, verifier = sheets.get_authorization_url()
    assert url.startswith("https://accounts.google.com")
    assert state == "state123"
    assert verifier == "verifier123"


@patch("sheets.Flow.from_client_config")
def test_exchange_code_for_credentials(mock_from_client_config):
    mock_flow = MagicMock()
    mock_creds = MagicMock()
    mock_creds.to_json.return_value = '{"token": "my_access_token"}'
    mock_flow.credentials = mock_creds
    mock_from_client_config.return_value = mock_flow

    creds_json = sheets.exchange_code_for_credentials("my_auth_code", "verifier123")
    assert creds_json == '{"token": "my_access_token"}'
    mock_flow.fetch_token.assert_called_once_with(code="my_auth_code", code_verifier="verifier123")


@patch("sheets.Credentials.from_authorized_user_info")
@patch("sheets.build")
def test_get_user_sheets_service(mock_build, mock_from_info):
    mock_creds = MagicMock()
    mock_from_info.return_value = mock_creds

    sheets.get_user_sheets_service('{"token": "my_access_token"}')
    mock_from_info.assert_called_once()
    mock_build.assert_called_once_with("sheets", "v4", credentials=mock_creds)
