-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NULL,
    `bio` TEXT NULL,
    `avatar` VARCHAR(191) NULL,
    `isVerified` BOOLEAN NOT NULL DEFAULT false,
    `isPrivate` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `password` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `follows` (
    `id` VARCHAR(191) NOT NULL,
    `followerId` VARCHAR(191) NOT NULL,
    `followingId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `follows_followerId_followingId_key`(`followerId`, `followingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `posts` (
    `id` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `imageUrl` VARCHAR(191) NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `bookId` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `likes` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `likes_userId_postId_key`(`userId`, `postId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `comments` (
    `id` VARCHAR(191) NOT NULL,
    `content` TEXT NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `books` (
    `id` VARCHAR(191) NOT NULL,
    `googleId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `authors` TEXT NOT NULL,
    `description` TEXT NULL,
    `isbn` VARCHAR(191) NULL,
    `publisher` VARCHAR(191) NULL,
    `publishedDate` VARCHAR(191) NULL,
    `pageCount` INTEGER NULL,
    `categories` TEXT NULL,
    `imageUrl` VARCHAR(191) NULL,
    `language` VARCHAR(191) NOT NULL DEFAULT 'es',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `books_googleId_key`(`googleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `book_lists` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT true,
    `userId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `book_list_items` (
    `id` VARCHAR(191) NOT NULL,
    `bookListId` VARCHAR(191) NOT NULL,
    `bookId` VARCHAR(191) NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `book_list_items_bookListId_bookId_key`(`bookListId`, `bookId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reviews` (
    `id` VARCHAR(191) NOT NULL,
    `rating` INTEGER NOT NULL,
    `content` TEXT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `bookId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `reviews_userId_bookId_key`(`userId`, `bookId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reading_progress` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `bookId` VARCHAR(191) NOT NULL,
    `status` ENUM('WANT_TO_READ', 'READING', 'FINISHED', 'DNF') NOT NULL DEFAULT 'WANT_TO_READ',
    `currentPage` INTEGER NOT NULL DEFAULT 0,
    `totalPages` INTEGER NULL,
    `startDate` DATETIME(3) NULL,
    `finishDate` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `reading_progress_userId_bookId_key`(`userId`, `bookId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `follows` ADD CONSTRAINT `follows_followerId_fkey` FOREIGN KEY (`followerId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `follows` ADD CONSTRAINT `follows_followingId_fkey` FOREIGN KEY (`followingId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `posts` ADD CONSTRAINT `posts_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `likes` ADD CONSTRAINT `likes_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `likes` ADD CONSTRAINT `likes_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `comments` ADD CONSTRAINT `comments_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `book_lists` ADD CONSTRAINT `book_lists_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `book_list_items` ADD CONSTRAINT `book_list_items_bookListId_fkey` FOREIGN KEY (`bookListId`) REFERENCES `book_lists`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `book_list_items` ADD CONSTRAINT `book_list_items_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reading_progress` ADD CONSTRAINT `reading_progress_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reading_progress` ADD CONSTRAINT `reading_progress_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `books`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
