type ResponseWraper<Data = Record<string, unknown>> =
  | ({
      success: true;
    } & Data)
  | {
      success: false;
      message: string;
    };
export default ResponseWraper;
