CREATE TABLE `performers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`gender` enum('male','female','other') NOT NULL DEFAULT 'other',
	`bio` text,
	`avatar` text,
	`performDuration` int NOT NULL DEFAULT 45,
	`maxSongsPerSession` int NOT NULL DEFAULT 6,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `performers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`performerId` int NOT NULL,
	`title` varchar(256),
	`status` enum('upcoming','active','ended') NOT NULL DEFAULT 'upcoming',
	`scheduledAt` timestamp,
	`startedAt` timestamp,
	`endedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `song_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int NOT NULL,
	`performerId` int NOT NULL,
	`songId` int NOT NULL,
	`userId` int NOT NULL,
	`requesterName` varchar(128),
	`message` text,
	`status` enum('pending','playing','done','skipped') NOT NULL DEFAULT 'pending',
	`queueOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `song_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `songs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`performerId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`artist` varchar(128),
	`album` varchar(256),
	`duration` int,
	`coverUrl` text,
	`neteaseId` varchar(64),
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `songs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tips` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` int,
	`performerId` int NOT NULL,
	`userId` int NOT NULL,
	`tipperName` varchar(128),
	`amount` decimal(10,2) NOT NULL,
	`message` text,
	`paymentStatus` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
	`wechatOrderId` varchar(128),
	`tradeNo` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tips_id` PRIMARY KEY(`id`),
	CONSTRAINT `tips_tradeNo_unique` UNIQUE(`tradeNo`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `wechatNickname` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `wechatAvatar` text;--> statement-breakpoint
CREATE INDEX `idx_requests_session` ON `song_requests` (`sessionId`);--> statement-breakpoint
CREATE INDEX `idx_requests_user` ON `song_requests` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_songs_performer` ON `songs` (`performerId`);--> statement-breakpoint
CREATE INDEX `idx_tips_performer` ON `tips` (`performerId`);--> statement-breakpoint
CREATE INDEX `idx_tips_user` ON `tips` (`userId`);