import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axios";

const initialState = {
  items: [],
  status: "idle",
  error: null,
};

export const fetchDocuments = createAsyncThunk("documents/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get("/documents");
    return data.documents;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Failed to load documents");
  }
});

export const uploadDocument = createAsyncThunk(
  "documents/upload",
  async (file, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await api.post("/documents/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return data.document;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Upload failed");
    }
  }
);

export const deleteDocument = createAsyncThunk(
  "documents/delete",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/documents/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Delete failed");
    }
  }
);

const documentsSlice = createSlice({
  name: "documents",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocuments.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchDocuments.fulfilled, (state, action) => {
        state.status = "idle";
        state.items = action.payload;
      })
      .addCase(fetchDocuments.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(uploadDocument.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(deleteDocument.fulfilled, (state, action) => {
        state.items = state.items.filter((d) => d._id !== action.payload);
      });
  },
});

export default documentsSlice.reducer;
