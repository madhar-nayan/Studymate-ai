import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import documentsReducer from "./slices/documentsSlice";
import quizzesReducer from "./slices/quizSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    documents: documentsReducer,
    quizzes: quizzesReducer,
  },
});
