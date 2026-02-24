import { compactFormat } from "@/lib/format-number";
import { getOverviewData } from "../../fetch";
import { OverviewCard } from "./card";
import * as icons from "./icons";
import { IoCarSportSharp } from "react-icons/io5";
import Link from "next/link";
import { Building2, Car } from "lucide-react";

export async function OverviewCardsGroup() {
  const { views, profit, products, users } = await getOverviewData();

  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4 2xl:gap-7.5">
      <div
        className="group relative cursor-pointer overflow-hidden bg-white rounded-2xl px-6 pt-12 pb-10 shadow-2xl ring-1 ring-gray-900/5 transition-all duration-500 transform hover:scale-105 hover:shadow-3xl w-full sm:px-12 dark:bg-gray-800 dark:ring-gray-700"
      >
        <span
          className="absolute top-0 left-0 z-0 h-32 w-32 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 opacity-75 transition-all duration-500 transform group-hover:scale-[20]"
        ></span>
        <div className="relative z-10 mx-auto max-w-md">
          <span
            className="grid h-24 w-24 place-items-center rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-500 transform group-hover:bg-gradient-to-r group-hover:from-pink-500 group-hover:to-yellow-500"
          >
            <IoCarSportSharp className="h-12 w-12 text-white transition-all" />
          </span>
          <div
            className="space-y-6 pt-6 text-lg leading-8 text-gray-700 transition-all duration-500 group-hover:text-white"
          >
            <p className="font-medium dark:text-white">
              Car Price Evaluator
            </p>
          </div>
          <div className="pt-6 text-lg font-semibold leading-7">
            <p>
              <span
                className="text-purple-500 transition-all duration-500 group-hover:text-white"
              >Explore →</span
              >
            </p>
          </div>
        </div>
      </div>

      <Link
        href="/admin/dealers"
        className="group relative block overflow-hidden rounded-2xl bg-white px-6 pt-12 pb-10 shadow-2xl ring-1 ring-gray-900/5 transition-all duration-500 hover:scale-105 hover:shadow-3xl dark:bg-gray-800 dark:ring-gray-700 sm:px-12"
      >
        <span className="absolute top-0 left-0 z-0 h-32 w-32 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 opacity-75 transition-all duration-500 group-hover:scale-[20]"></span>
        <div className="relative z-10 mx-auto max-w-md">
          <span className="grid h-24 w-24 place-items-center rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 transition-all duration-500 group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-cyan-600">
            <Building2 className="h-12 w-12 text-white transition-all" />
          </span>
          <div className="space-y-6 pt-6 text-lg leading-8 text-gray-700 transition-all duration-500 group-hover:text-white">
            <p className="font-medium dark:text-white">Dealers</p>
          </div>
          <div className="pt-6 text-lg font-semibold leading-7">
            <p>
              <span className="text-indigo-500 transition-all duration-500 group-hover:text-white">
                View all dealers →
              </span>
            </p>
          </div>
        </div>
      </Link>

      <Link
        href="/admin/listings"
        className="group relative block overflow-hidden rounded-2xl bg-white px-6 pt-12 pb-10 shadow-2xl ring-1 ring-gray-900/5 transition-all duration-500 hover:scale-105 hover:shadow-3xl dark:bg-gray-800 dark:ring-gray-700 sm:px-12"
      >
        <span className="absolute top-0 left-0 z-0 h-32 w-32 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 opacity-75 transition-all duration-500 group-hover:scale-[20]"></span>
        <div className="relative z-10 mx-auto max-w-md">
          <span className="grid h-24 w-24 place-items-center rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500 group-hover:bg-gradient-to-r group-hover:from-emerald-600 group-hover:to-teal-600">
            <Car className="h-12 w-12 text-white transition-all" />
          </span>
          <div className="space-y-6 pt-6 text-lg leading-8 text-gray-700 transition-all duration-500 group-hover:text-white">
            <p className="font-medium dark:text-white">Active Listings</p>
          </div>
          <div className="pt-6 text-lg font-semibold leading-7">
            <p>
              <span className="text-emerald-500 transition-all duration-500 group-hover:text-white">
                View listings →
              </span>
            </p>
          </div>
        </div>
      </Link>

      {/* <OverviewCard
        label="Total Views"
        data={{
          ...views,
          value: compactFormat(views.value),
        }}
        Icon={icons.Views}
      />

      <OverviewCard
        label="Total Profit"
        data={{
          ...profit,
          value: "$" + compactFormat(profit.value),
        }}
        Icon={icons.Profit}
      />

      <OverviewCard
        label="Total Products"
        data={{
          ...products,
          value: compactFormat(products.value),
        }}
        Icon={icons.Product}
      />

      <OverviewCard
        label="Total Users"
        data={{
          ...users,
          value: compactFormat(users.value),
        }}
        Icon={icons.Users}
      /> */}
    </div>
  );
}
