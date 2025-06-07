"use client";
import React from "react";
import { useState, useEffect } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useConvexMutation, useConvexQuery } from "@/hooks/use-convex-query";
import { api } from "@/convex/_generated/api";
import { getAllCategories } from "@/lib/expense-categories";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { err } from "inngest/types";
import { toast } from "sonner";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import CategorySelector from "./category-selector";
import GroupSelector from "./group-selector";
import ParticipantSelector from "./participant-selector";
import SplitSelector from "./split-selector";
// Form schema validation
const expenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: "Amount must be a positive number",
    }),
  category: z.string().optional(),
  date: z.date(),
  paidByUserId: z.string().min(1, "Payer is required"),
  splitType: z.enum(["equal", "percentage", "exact"]),
  groupId: z.string().optional(),
});

const ExpenseForm = ({ type, onSuccess }) => {
  const [participants, setParticipants] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [splits, setSplits] = useState([]);

  const { data: currentUser } = useConvexQuery(api.users.getCurrentUser);

  const createExpense = useConvexMutation(api.expenses.createExpense);
  const categories = getAllCategories();
  // Set up form with validation
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: "",
      amount: "",
      category: "",
      date: new Date(),
      paidByUserId: currentUser?._id || "",
      splitType: "equal",
      groupId: undefined,
    },
  });

  // Watch for changes
  const amountValue = watch("amount");
  const paidByUserId = watch("paidByUserId");
  // When a user is added or removed, update the participant list
  useEffect(() => {
    if (participants.length === 0 && currentUser) {
      // Always add the current user as a participant
      setParticipants([
        {
          id: currentUser._id,
          name: currentUser.name,
          email: currentUser.email,
          imageUrl: currentUser.imageUrl,
        },
      ]);
    }
  }, [currentUser, participants]);
  const onSubmit = async (data) => {
    try {
      const amount = parseFloat(data.amount);
      // Prepare splits in the format expected by the API
      const formattedSplits = splits.map((split) => ({
        userId: split.userId,
        amount: split.amount,
        paid: split.userId === data.paidByUserId,
      }));

      // Validate that splits add up to the total (with small tolerance)
      const totalSplitAmount = formattedSplits.reduce(
        (sum, split) => sum + split.amount,
        0
      );
      const tolerance = 0.01;

      if (Math.abs(totalSplitAmount - amount) > tolerance) {
        toast.error(
          `Split amounts don't add up to the total. Please adjust your splits.`
        );
        return;
      }
      // For 1:1 expenses, set groupId to undefined instead of empty string
      const groupId = type === "individual" ? undefined : data.groupId;

      // Create the expense
      await createExpense.mutate({
        description: data.description,
        amount: amount,
        category: data.category || "Other",
        date: data.date.getTime(), // Convert to timestamp
        paidByUserId: data.paidByUserId,
        splitType: data.splitType,
        splits: formattedSplits,
        groupId,
      });

      toast.success("Expense created successfully!");
      reset(); // Reset form
      const otherParticipant = participants.find(
        (p) => p.id !== currentUser._id
      );
      const otherUserId = otherParticipant?.id;

      if (onSuccess) onSuccess(type === "individual" ? otherUserId : groupId);
    } catch (err) {
      toast.error("Failed to create expense: " + error.message);
    }
  };
  if (!currentUser) return null;
  return (
    <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4">
        {/* description and amount */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Lunch, movie tickets.. etc."
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-red-500">
                {errors.description.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              placeholder="0.00"
              type="number"
              step="0.01"
              min="0.01"
              {...register("amount")}
            />
            {errors.amount && (
              <p className="text-sm text-red-500">{errors.amount.message}</p>
            )}
          </div>
        </div>

        {/* category and date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <CategorySelector
              categories={categories || []}
              onChange={(categoryId) => {
                if (categoryId) {
                  setValue("category", categoryId);
                }
              }}
            />
            {errors.category && (
              <p className="text-sm text-red-500">{errors.category.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => {
                    setSelectedDate(date);
                    setValue("date", date);
                    // we are using setValue because calendar is the third party form component
                  }}
                  className="rounded-md border"
                />
              </PopoverContent>
            </Popover>
            {errors.date && (
              <p className="text-sm text-red-500">{errors.date.message}</p>
            )}
          </div>
        </div>

        {type === "group" && (
          <div className="space-y-2">
            <Label>Group</Label>
            <GroupSelector
              onChange={(group) => {
                if (!selectedGroup || selectedGroup.id != group.id) {
                  setSelectedGroup(group);
                  setValue("groupId", group.id);

                  if (group.members && Array.isArray(group.members)) {
                    setParticipants(group.members);
                  }
                }
              }}
            />
            {!selectedGroup && (
              <p className="text-xs text-amber-600">
                Please select a group to continue
              </p>
            )}
          </div>
        )}
        {type === "individual" && (
          <div className="space-y-2">
            <Label>Participants</Label>
            <ParticipantSelector
              participants={participants}
              onParticipantsChange={setParticipants}
            />
            {participants.length <= 1 && (
              <p className="text-xs text-amber-600">
                Please add at least one other participant
              </p>
            )}
          </div>
        )}
        {/* paid by  */}
        <div className="space-y-2">
          <Label>Paid by</Label>
          <select
            {...register("paidByUserId")}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Select who paid</option>
            {participants.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id === currentUser._id ? "You" : p.name}
              </option>
            ))}
          </select>
          {errors.paidByUserId && (
            <p className="text-sm text-red-500">
              {errors.paidByUserId.message}
            </p>
          )}
        </div>

        {/* split type */}
        <div className="space-y-2">
          <Label>Split type</Label>
          <Tabs
            defaultValue="equal"
            onValueChange={(value) => setValue("splitType", value)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="equal">Equal</TabsTrigger>
              <TabsTrigger value="percentage">Percentage</TabsTrigger>
              <TabsTrigger value="exact">Exact</TabsTrigger>
            </TabsList>
            <TabsContent value="equal" className="pt-4">
              <p className="text-sm text-muted-foreground">
                split equally among all participants
              </p>
              <SplitSelector
                type="equal"
                amount={parseFloat(amountValue)}
                participants={participants}
                paidByUserId={paidByUserId}
                onSplitsChange={setSplits}
              />
            </TabsContent>
            <TabsContent value="percentage" className="pt-4">
              <p className="text-sm text-muted-foreground">
                split by percentage
              </p>
              <SplitSelector
                type="percentage"
                amount={parseFloat(amountValue)}
                participants={participants}
                paidByUserId={paidByUserId}
                onSplitsChange={setSplits}
              />
            </TabsContent>
            <TabsContent value="exact" className="pt-4">
              <p className="text-sm text-muted-foreground">
                Enter exact amounts
              </p>
              <SplitSelector
                type="exact"
                amount={parseFloat(amountValue)}
                participants={participants}
                paidByUserId={paidByUserId}
                onSplitsChange={setSplits}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* submit button */}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting || participants.length <= 1}
          >
            {isSubmitting ? "Creating" : "Create Expense"}
          </Button>
        </div>
      </div>
    </form>
  );
};

export default ExpenseForm;
