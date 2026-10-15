// "1 follower" / "1,204 followers"
export const followersLabel = (n: number) => `${n.toLocaleString("en-US")} ${n === 1 ? "follower" : "followers"}`
