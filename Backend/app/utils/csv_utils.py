import pandas as pd
from fastapi import HTTPException


def read_csv_safely(file_path: str):
    try:
        return pd.read_csv(file_path, encoding="utf-8")
    except UnicodeDecodeError:
        try:
            return pd.read_csv(file_path, encoding="latin1")
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid CSV file: {str(e)}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid CSV file: {str(e)}"
        )