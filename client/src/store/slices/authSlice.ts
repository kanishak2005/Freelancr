import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface AuthUser {
  id: string;
  fullName: string;
  username: string;
  email: string;
  role: string;
  avatar?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  initialized: boolean;
}

const initialState: AuthState = {
  isAuthenticated: !!localStorage.getItem("accessToken"),
  user: null,
  initialized: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,

  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<AuthUser>
    ) => {
      state.isAuthenticated = true;
      state.user = action.payload;
      state.initialized = true;
    },

    setAuthInitialized: (state) => {
      state.initialized = true;
    },

    clearCredentials: (state) => {
      state.isAuthenticated = false;
      state.user = null;
      state.initialized = true;
    },
  },
});

export const {
  setCredentials,
  setAuthInitialized,
  clearCredentials,
} = authSlice.actions;

export default authSlice.reducer;