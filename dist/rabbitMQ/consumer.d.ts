import { Channel } from "amqplib";
export declare const connectChannel: () => Promise<Channel>;
export declare const createConsumer: (params: {
    channel: Channel;
    exchange: string;
    queue: string;
    routingKey: string;
    handler: (data: any) => Promise<void>;
}) => Promise<void>;
