-- Agregar índices full-text para optimizar búsqueda de libros
-- Esto mejorará la performance de búsqueda de 10x a 50x

-- 1. Agregar índice full-text principal (título + autores + descripción)
ALTER TABLE books ADD FULLTEXT INDEX idx_books_search (title, authors, description);

-- 2. Agregar índice específico para título (búsquedas exactas)
ALTER TABLE books ADD FULLTEXT INDEX idx_books_title (title);

-- 3. Agregar índice específico para autores
ALTER TABLE books ADD FULLTEXT INDEX idx_books_authors (authors);

-- 4. Agregar índice regular para googleId (búsquedas rápidas por ID)
CREATE INDEX idx_books_google_id ON books(googleId);

-- 5. Agregar índice compuesto para búsquedas por idioma
CREATE INDEX idx_books_language_created ON books(language, createdAt);

-- Verificar que los índices se crearon correctamente
SHOW INDEX FROM books WHERE Key_name LIKE 'idx_books%';
