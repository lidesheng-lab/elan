type MemberSession = {
  email: string;
  session: string;
  request: (body: Record<string, string>, signal?: AbortSignal) => Promise<any>;
  photo: (url: string) => string;
};

export function membership(): MemberSession {
  return (window as Window & { elanMember: MemberSession }).elanMember;
}

export function memberAsset(url: string) {
  return membership().photo(url);
}
