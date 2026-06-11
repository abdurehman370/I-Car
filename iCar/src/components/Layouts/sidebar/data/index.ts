import * as Icons from "../icons";

export const ADMIN_NAV_DATA = [
  {
    label: "MAIN MENU",
    items: [
      {
        title: "Dashboard",
        icon: Icons.HomeIcon,
        url: "/admin",
        items: [],
      },
      {
        title: "Profile",
        url: "/admin/profile",
        icon: Icons.User,
        items: [],
      },
      {
        title: "Users",
        url: "/admin/users",
        icon: Icons.Table,
        items: [],
      },
      {
        title: "Listings",
        url: "/admin/listings",
        icon: Icons.FourCircle,
        items: [],
      },
      {
        title: "Taxonomy",
        url: "/admin/taxonomy",
        icon: Icons.Table,
        items: [],
      },
    ],
  },
  {
    label: "OTHERS",
    items: [
      {
        title: "Authentication",
        icon: Icons.Authentication,
        items: [
          {
            title: "Authenticate Dealers",
            url: "/admin/authenticate-dealers",
          },
        ],
      },
    ],
  },
];

export const DEALER_NAV_DATA = [
  {
    label: "MAIN MENU",
    items: [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: Icons.HomeIcon,
        items: [],
      },
      {
        title: "List Vehicle",
        url: "/list-vehicle",
        icon: Icons.FourCircle,
        items: [],
      },
      {
        title: "Alerts",
        url: "/alerts",
        icon: Icons.Authentication,
        items: [],
      },
      {
        title: "Dealer Tools",
        url: "/dealer-tools",
        icon: Icons.PieChart,
        items: [],
      },
      {
        title: "Profile",
        url: "/profile",
        icon: Icons.User,
        items: [],
      },
    ],
  },
  {
    label: "SUPPORT",
    items: [
      {
        title: "Settings",
        url: "/profile",
        icon: Icons.Alphabet,
        items: [],
      },
    ],
  },
];

export const NAV_DATA = ADMIN_NAV_DATA;

