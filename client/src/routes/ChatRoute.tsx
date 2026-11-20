import { useParams } from "react-router-dom";
import ChatPage from "../pages/ChatPage";

export default function ChatRoute() {
  const { userId } = useParams<{
    userId?: string;
  }>();

  return <ChatPage userId={userId} />;
}
