"use client";
import { api } from "@/convex/_generated/api";
import { useConvexQuery } from "@/hooks/use-convex-query";
import { ChevronRight, PlusCircle } from "lucide-react";
import Link from "next/link";
import React from "react";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { BarLoader } from "react-spinners";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import ExpenseSummary from "./components/expense-summary";
import { BalanceSummary } from "./components/balance-summary";
import GroupList from "./components/group-list";

const DashboardPage = () => {
  const { data: balances, isLoading: balancesLoading } = useConvexQuery(
    api.dashboard.getUserBalances
  );
  const { data: groups, isLoading: groupsLoading } = useConvexQuery(
    api.dashboard.getUserGroups
  );
  const { data: totalSpent, isLoading: totalSpentLoading } = useConvexQuery(
    api.dashboard.getTotalSpent
  );
  const { data: monthlySpending, isLoading: monthlySpendingLoading } =
    useConvexQuery(api.dashboard.getMonthlySpending);

  const isLoading =
    balancesLoading ||
    groupsLoading ||
    totalSpentLoading ||
    monthlySpendingLoading;
  return (
    <div>
      {isLoading ? (
        <div className="w-full py-12 flex justify-center">
          <BarLoader width={"100%"} color="#36d7b7" />
        </div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row items-center justify-between mx-4 my-4">
            <h1 className="text-3xl sm:text-5xl gradient-title mb-4 sm:mb-0">
              Dashboard
            </h1>
            <Button asChild>
              <Link
                href="/expenses/new"
                className="flex items-center px-4 py-2 text-sm sm:text-base"
              >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Expense
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 m-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {balances.totalBalance > 0 ? (
                    <span className="text-green-600">
                      +₹{balances?.totalBalance.toFixed(2)}
                    </span>
                  ) : balances?.totalBalance < 0 ? (
                    <span className="text-red-600">
                      -₹{Math.abs(balances?.totalBalance).toFixed(2)}
                    </span>
                  ) : (
                    <span>₹0.00</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {balances?.totalBalance > 0
                    ? "You are owed money"
                    : balances?.totalBalance < 0
                      ? "You owe money"
                      : "All settled up!"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  You are owed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>₹{balances?.youAreOwed.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  From {balances?.oweDetails?.youAreOwedBy?.length || 0} people
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  You owe
                </CardTitle>
              </CardHeader>
              <CardContent>
                {balances?.oweDetails?.youOwe?.length > 0 ? (
                  <>
                    <div className="text-2xl font-bold text-red-600">
                      ₹{balances?.youOwe.toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      To {balances?.oweDetails?.youOwe?.length || 0} people
                    </p>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">₹0.00</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      You dont owe anyone
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 m-4">
            {/* left column */}
            <div className="lg:col-span-2 space-y-6">
              {/* expense summary */}
              <ExpenseSummary
                monthlySpending={monthlySpending}
                totalSpent={totalSpent}
              />
            </div>
            {/* right column */}
            <div className="space-y-6">
              {/* balancedetails */}
              <Card>
                <CardHeader className="pb-2 flex items-center justify-between">
                  <CardTitle>Balance Details</CardTitle>
                  <Button variant="link" asChild className="p-0">
                    <Link href="/contacts">
                      View all
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <BalanceSummary balances={balances} />
                </CardContent>
              </Card>
              {/* groups */}
              <Card>
                <CardHeader className="pb-2 flex items-center justify-between">
                  <CardTitle>Your groups</CardTitle>
                  <Button variant="link" asChild className="p-0">
                    <Link href="/contacts">
                      View all
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </CardHeader>
                <CardContent>
                  <GroupList groups={groups} />
                </CardContent>
                <CardFooter>
                  <Button className="w-full" asChild variant="outline">
                    <Link href="/contacts?createGroup=true">
                      <Users className="mr-2 h-4 w-4" />
                      Create new group
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
