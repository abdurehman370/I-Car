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
        title: "Forms",
        icon: Icons.Alphabet,
        items: [
          {
            title: "Form Elements",
            url: "/admin/forms/form-elements",
          },
          {
            title: "Form Layout",
            url: "/admin/forms/form-layout",
          },
        ],
      },
      {
        title: "Tables",
        url: "/admin/tables",
        icon: Icons.Table,
        items: [
          {
            title: "Tables",
            url: "/admin/tables",
          },
        ],
      },
      {
        title: "Pages",
        icon: Icons.Alphabet,
        items: [
          {
            title: "Settings",
            url: "/admin/pages/settings",
          },
        ],
      },
    ],
  },
  {
    label: "OTHERS",
    items: [
      {
        title: "UI Elements",
        icon: Icons.FourCircle,
        items: [
          {
            title: "Alerts",
            url: "/admin/ui-elements/alerts",
          },
          {
            title: "Buttons",
            url: "/admin/ui-elements/buttons",
          },
        ],
      },
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
        url: "/pages/settings",
        icon: Icons.Alphabet,
        items: [],
      },
    ],
  },
];

export const NAV_DATA = ADMIN_NAV_DATA;

