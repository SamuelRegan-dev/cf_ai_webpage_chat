CREATE TABLE IF NOT EXISTS pages (
                                     id TEXT PRIMARY KEY,
                                     session_id TEXT NOT NULL,
                                     url TEXT NOT NULL,
                                     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chunks (
                                      id TEXT PRIMARY KEY,
                                      page_id TEXT NOT NULL,
                                      chunk_text TEXT NOT NULL,
                                      vector_id TEXT NOT NULL,
                                      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                      FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
    );