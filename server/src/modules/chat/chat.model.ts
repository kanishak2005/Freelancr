import { Schema, model } from "mongoose";
import { IChat } from "./chat.types";

const chatSchema = new Schema<IChat>(
  {
    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiver: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    message: {
      type: String,
      required: true,
      trim: true,
    },

    attachments: [
      {
        type: String,
      },
    ],

    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Chat = model<IChat>(
  "Chat",
  chatSchema
);