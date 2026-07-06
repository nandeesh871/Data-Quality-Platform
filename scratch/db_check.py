import sqlite3
import os

db_path = "backend/data_quality.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Print datasets
    cursor.execute("SELECT * FROM datasets;")
    print("DATASETS:")
    for row in cursor.fetchall():
        print(row)
        
    # Print lineage logs
    cursor.execute("SELECT * FROM lineage_logs;")
    print("\nLINEAGE LOGS:")
    for row in cursor.fetchall():
        print(row)
        
    conn.close()
