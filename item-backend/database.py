import mysql.connector
from mysql.connector import pooling
from fastapi import HTTPException

db_config = {
    "host": "host.docker.internal",
    "port": 3306,
    "user": "root",
    "password": "tmdals1004^^",
    "database": "splucid",
    "auth_plugin": "mysql_native_password"
}

try:
    db_pool = mysql.connector.pooling.MySQLConnectionPool(
        pool_name="lucid_pool",
        pool_size=10,
        **db_config
    )
    print("✅ MySQL Database Connected via Pool!")
except mysql.connector.Error as err:
    print(f"❌ DB Connection Error: {err}")
    db_pool = None

# FastAPI Depends용 (자동 반납 처리)
def get_db():
    if not db_pool:
        raise HTTPException(status_code=500, detail="Database pool not initialized")
    
    connection = db_pool.get_connection()
    try:
        yield connection
    finally:
        if connection.is_connected():
            connection.close()