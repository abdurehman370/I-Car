import UserPortalGuard from "@/components/Layouts/UserPortalGuard";

export default function UserPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UserPortalGuard>{children}</UserPortalGuard>;
}
