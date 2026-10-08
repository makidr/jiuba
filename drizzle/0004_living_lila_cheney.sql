CREATE TABLE `payment_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` varchar(64) NOT NULL,
	`tipId` int NOT NULL,
	`channel` enum('meituan','wechat','alipay') NOT NULL,
	`amount` int NOT NULL,
	`status` enum('pending','success','failed','refund') NOT NULL DEFAULT 'pending',
	`transactionId` varchar(128),
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payment_orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_orders_orderId_unique` UNIQUE(`orderId`)
);
--> statement-breakpoint
ALTER TABLE `payment_orders` ADD CONSTRAINT `payment_orders_tipId_tips_id_fk` FOREIGN KEY (`tipId`) REFERENCES `tips`(`id`) ON DELETE cascade ON UPDATE no action;