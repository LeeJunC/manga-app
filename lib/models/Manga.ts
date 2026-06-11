import mongoose, { Schema, Document, Model } from "mongoose";

export interface IManga extends Document {
  title: string;
  alternativeTitles?: string[];
  author?: string;
  artist?: string;
  description?: string;
  coverImage?: string;
  genres?: string[];
  status?: "ongoing" | "completed" | "hiatus" | "cancelled";

  // Track across multiple sources
  sources: {
    name: "mangadex" | "weebcentral" | "other";
    id: string; // ID from the source
    url: string; // URL to the manga on that source
  }[];

  // Latest chapter tracking
  latestChapter?: {
    number: string;
    title?: string;
    source: string;
    updatedAt: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

const MangaSchema: Schema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    alternativeTitles: [String],
    author: {
      type: String,
      trim: true,
    },
    artist: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
    },
    coverImage: {
      type: String,
    },
    genres: [String],
    status: {
      type: String,
      enum: ["ongoing", "completed", "hiatus", "cancelled"],
      default: "ongoing",
    },
    sources: [
      {
        name: {
          type: String,
          required: true,
          enum: ["mangadex", "weebcentral", "other"],
        },
        id: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
      },
    ],
    latestChapter: {
      number: String,
      title: String,
      source: String,
      updatedAt: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
MangaSchema.index({ title: "text" });
MangaSchema.index({ "sources.name": 1, "sources.id": 1 });
MangaSchema.index({ updatedAt: -1 });

const Manga: Model<IManga> =
  mongoose.models.Manga || mongoose.model<IManga>("Manga", MangaSchema);

export default Manga;
