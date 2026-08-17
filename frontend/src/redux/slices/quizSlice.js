import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios";

const initialState = {
  items: [],
  active: null,
  status: "idle",
  error: null,
};

export const fetchQuizzes = createAsyncThunk("quizzes/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/quizzes");
    return data.quizzes;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to load quizzes");
  }
});

export const fetchQuizById = createAsyncThunk("quizzes/fetchOne", async (id, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/quizzes/${id}`);
    return data.quiz;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to load quiz");
  }
});

export const generateQuiz = createAsyncThunk(
  "quizzes/generate",
  async ({ documentId, numQuestions }, { rejectWithValue }) => {
    try {
      const { data } = await api.post(`/quizzes/generate/${documentId}`, { numQuestions });
      return data.quiz;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Quiz generation failed");
    }
  }
);

const quizSlice = createSlice({
  name: "quizzes",
  initialState,
  reducers: {
    clearActiveQuiz(state) {
      state.active = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchQuizzes.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchQuizzes.fulfilled, (state, action) => {
        state.status = "idle";
        state.items = action.payload;
      })
      .addCase(fetchQuizzes.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(fetchQuizById.fulfilled, (state, action) => {
        state.active = action.payload;
      })
      .addCase(generateQuiz.pending, (state) => {
        state.status = "generating";
        state.error = null;
      })
      .addCase(generateQuiz.fulfilled, (state, action) => {
        state.status = "idle";
        state.items.unshift(action.payload);
        state.active = action.payload;
      })
      .addCase(generateQuiz.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      });
  },
});

export const { clearActiveQuiz } = quizSlice.actions;
export default quizSlice.reducer;
