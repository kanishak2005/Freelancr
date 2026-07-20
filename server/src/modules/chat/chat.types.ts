import { Document, Types } from "mongoose";

export interface IChat extends Document {
  sender: Types.ObjectId;
  receiver: Types.ObjectId;
  message: string;
  attachments: string[];
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}