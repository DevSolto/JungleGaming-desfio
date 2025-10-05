export interface CommentDTO {
  id: string;
  taskId: string;
  authorId: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export type Comment = CommentDTO;
