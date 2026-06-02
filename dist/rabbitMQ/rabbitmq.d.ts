import { Channel } from "amqplib";
export declare const connectRabbitMQ: () => Promise<Channel | null>;
