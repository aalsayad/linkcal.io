export const oneMonthAgo = (): string => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date.toISOString();
};

export const threeMonthsAhead = (): string => {
  const date = new Date();
  date.setMonth(date.getMonth() + 3);
  return date.toISOString();
};

export const isValidEventDate = (dateString: string): boolean => {
  try {
    return !isNaN(new Date(dateString).getTime());
  } catch {
    return false;
  }
};
