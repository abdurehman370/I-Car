/*
  Warnings:

  - You are about to drop the column `imageData` on the `ListingImage` table. All the data in the column will be lost.
  - Added the required column `url` to the `ListingImage` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ListingImage` DROP COLUMN `imageData`,
    ADD COLUMN `url` VARCHAR(191) NOT NULL;
