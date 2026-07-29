export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Feed: undefined;
  CreatePost: undefined;
  Comments: { postId: string; commentCount: number };
};
