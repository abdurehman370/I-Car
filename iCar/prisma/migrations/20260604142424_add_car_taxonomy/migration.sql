-- CreateTable
CREATE TABLE `Alert` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `dealerId` INTEGER NOT NULL,
    `make` VARCHAR(191) NOT NULL,
    `model` VARCHAR(191) NOT NULL,
    `yearMin` INTEGER NULL,
    `yearMax` INTEGER NULL,
    `variant` VARCHAR(191) NULL,
    `region` VARCHAR(191) NOT NULL,
    `frequency` VARCHAR(191) NOT NULL DEFAULT 'daily',
    `enabled` BOOLEAN NOT NULL DEFAULT true,
    `lastRun` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Alert_dealerId_idx`(`dealerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CarMake` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CarMake_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CarModel` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `makeId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CarModel_makeId_idx`(`makeId`),
    UNIQUE INDEX `CarModel_makeId_name_key`(`makeId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CarVariant` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `modelId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CarVariant_modelId_idx`(`modelId`),
    UNIQUE INDEX `CarVariant_modelId_name_key`(`modelId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Alert` ADD CONSTRAINT `Alert_dealerId_fkey` FOREIGN KEY (`dealerId`) REFERENCES `Dealer`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CarModel` ADD CONSTRAINT `CarModel_makeId_fkey` FOREIGN KEY (`makeId`) REFERENCES `CarMake`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CarVariant` ADD CONSTRAINT `CarVariant_modelId_fkey` FOREIGN KEY (`modelId`) REFERENCES `CarModel`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
