import { AuctionsListView } from "@/components/auctions/AuctionsListView";

export default function UserAuctionsPage() {
  return <AuctionsListView detailBasePath="/user/auctions" variant="user" />;
}
