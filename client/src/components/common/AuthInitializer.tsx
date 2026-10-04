import { useEffect } from "react";

import {
  getCurrentUser,
} from "../../services/auth.api";

import {
  clearCredentials,
  setAuthInitialized,
  setCredentials,
} from "../../store/slices/authSlice";

import { useAppDispatch } from "../../store/hooks";

export default function AuthInitializer() {
  const dispatch = useAppDispatch();

  useEffect(() => {
    const initializeAuth =
      async () => {
        const token =
          localStorage.getItem(
            "accessToken"
          );

        if (!token) {
          dispatch(
            setAuthInitialized()
          );
          return;
        }

        try {
          const user =
            await getCurrentUser();

          dispatch(
            setCredentials(user)
          );
        } catch (error) {
          console.error(
            "Authentication initialization failed:",
            error
          );

          localStorage.removeItem(
            "accessToken"
          );

          dispatch(
            clearCredentials()
          );
        }
      };

    initializeAuth();
  }, [dispatch]);

  return null;
}