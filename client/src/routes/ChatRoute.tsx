import { useParams } from "react-router-dom";
import ChatPage from "../pages/ChatPage";
import NotFoundPage from "../pages/NotFoundPage";

export default function ChatRoute() {
  const { userId } = useParams<{
    userId: string;
  }>();

  if (!userId) {
    return <NotFoundPage />;
  }

  return <ChatPage userId={userId} />;
}
