-- AlterTable
ALTER TABLE `book_lists` ADD COLUMN `isSystemList` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `book_lists` ADD COLUMN `systemType` ENUM('WANT_TO_READ', 'READING', 'FINISHED');

-- AlterTable - Agregar currentPage
ALTER TABLE `book_list_items` ADD COLUMN `currentPage` INTEGER;

-- AlterTable - Agregar updatedAt como nullable primero
ALTER TABLE `book_list_items` ADD COLUMN `updatedAt` DATETIME(3) DEFAULT CURRENT_TIMESTAMP(3);

-- Actualizar registros existentes para que tengan updatedAt = createdAt
UPDATE `book_list_items` SET `updatedAt` = `createdAt` WHERE `updatedAt` IS NULL;

-- Ahora hacer la columna NOT NULL
ALTER TABLE `book_list_items` MODIFY COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX `book_lists_userId_systemType_key` ON `book_lists`(`userId`, `systemType`);
