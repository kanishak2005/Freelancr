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
      maxlength: 2000,
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

chatSchema.index({
  sender: 1,
  receiver: 1,
  createdAt: 1,
});

chatSchema.index({
  receiver: 1,
  sender: 1,
  isRead: 1,
});

export const Chat = model<IChat>(
  "Chat",
  chatSchema
);
