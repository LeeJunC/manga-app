import mongoose, { Schema, Document, Model } from "mongoose";

export interface IChapter extends Document {
  mangaId: mongoose.Types.ObjectId;

  // Chapter info
  number: string; // Can be "1", "1.5", "200", etc.
  title?: string;
  volume?: string;

  // Source information
  source: {
    name: "mangadex" | "weebcentral" | "other";
    id: string; // Chapter ID from the source
    url: string; // URL to read this chapter
  };

  // Metadata
  publishedAt?: Date;
  pages?: number;
  translatedLanguage?: string;
  scanlationGroup?: string;

  createdAt: Date;
  updatedAt: Date;
}

const ChapterSchema: Schema = new Schema(
  {
    mangaId: {
      type: Schema.Types.ObjectId,
      ref: "Manga",
      required: true,
      index: true,
    },
    number: {
      type: String,
      required: true,
    },
    title: {
      type: String,
    },
    volume: {
      type: String,
    },
    source: {
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
    publishedAt: {
      type: Date,
    },
    pages: {
      type: Number,
    },
    translatedLanguage: {
      type: String,
      default: "en",
    },
    scanlationGroup: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent duplicate chapters from same source
ChapterSchema.index({ mangaId: 1, "source.name": 1, "source.id": 1 }, { unique: true });
ChapterSchema.index({ mangaId: 1, number: 1 });
ChapterSchema.index({ publishedAt: -1 });

const Chapter: Model<IChapter> =
  mongoose.models.Chapter || mongoose.model<IChapter>("Chapter", ChapterSchema);

export default Chapter;
