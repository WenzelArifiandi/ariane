// Sanity types for better type safety
export interface SanityProject {
  _id: string;
  title: string;
  slug: string;
  year?: number;
  role?: string;
  summary?: string;
  tags?: string[];
  featured?: boolean;
  hero?: {
    _type: "image";
    asset: {
      _ref: string;
      _type: "reference";
    };
    alt?: string;
  };
  gallery?: Array<{
    _type: "image";
    asset: {
      _ref: string;
      _type: "reference";
    };
    alt?: string;
  }>;
  body?: unknown; // Portable text content
}

export interface SanityAbout {
  _id: string;
  bio?: unknown; // Portable text content
  headshot?: {
    _type: "image";
    asset: {
      _ref: string;
      _type: "reference";
    };
  };
  skills?: string[];
  cv?: {
    _type: "file";
    asset: {
      _ref: string;
      _type: "reference";
    };
  };
}

export interface SanityLink {
  _id: string;
  label: string;
  url: string;
  category?: string;
  pin?: boolean;
}

export interface SanityApprovedUser {
  _id: string;
  email: string;
}

export interface SanityAccessRequest {
  _id: string;
  email: string;
  status: "pending" | "approved" | "denied";
  createdAt: string;
}
