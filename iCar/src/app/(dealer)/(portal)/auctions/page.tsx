import { AuctionsListView } from "@/components/auctions/AuctionsListView";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";

export default function DealerAuctionsPage() {
  return (
    <>
      <Breadcrumb pageName="Vehicle Auctions" />
      <AuctionsListView detailBasePath="/auctions" variant="dealer" />
    </>
  );
}
