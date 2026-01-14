'use client';

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Edit, Trash2, Shield, X, Search, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import {
  analystRules,
  analystTypesWithServices,
  internalUsers,
  InternalUserOption,
  AnalystTypeWithServices,
} from "@/data/analystUserData";
import { analystRuleSchema, AnalystRuleFormData } from "@/lib/schemas";

export default function AnalystRuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const [isEditing, setIsEditing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const [typeSearch, setTypeSearch] = useState("");
  const [typePopoverOpen, setTypePopoverOpen] = useState(false);
  const [accessSearch, setAccessSearch] = useState("");
  const [accessPopoverOpen, setAccessPopoverOpen] = useState(false);

  const analystRule = analystRules.find((r) => r.id === id);

  const form = useForm<AnalystRuleFormData>({
    resolver: zodResolver(analystRuleSchema),
    defaultValues: {
      userId: analystRule?.userId || "",
      userName: analystRule?.userName || "",
      analystTypeId: analystRule?.analystTypeId || "",
      analystTypeName: analystRule?.analystTypeName || "",
      accessAnalystTypes: analystRule?.accessAnalystTypes || [],
      status: analystRule?.status || "Active",
    },
  });

  const selectedUser = form.watch("userId");
  const selectedType = form.watch("analystTypeId");
  const accessTypes = form.watch("accessAnalystTypes");

  if (!analystRule) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-muted-foreground">Analyst Rule not found</p>
        <Button
          variant="outline"
          onClick={() => router.push("/master/analyst-user?tab=rules")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Analyst User
        </Button>
      </div>
    );
  }

  const activeUsers = internalUsers.filter((u) => u.status === "Active");
  const activeTypes = analystTypesWithServices.filter((t) => t.status === "Active");

  const filteredUsers = activeUsers.filter(
    (user) =>
      userSearch.length > 0 &&
      (user.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const filteredTypes = activeTypes.filter(
    (type) =>
      typeSearch.length > 0 &&
      type.name.toLowerCase().includes(typeSearch.toLowerCase())
  );

  const filteredAccessTypes = activeTypes.filter(
    (type) =>
      type.id !== selectedType &&
      !accessTypes.some((a) => a.analystTypeId === type.id) &&
      accessSearch.length > 0 &&
      type.name.toLowerCase().includes(accessSearch.toLowerCase())
  );

  const handleSelectUser = (user: InternalUserOption) => {
    form.setValue("userId", user.id);
    form.setValue("userName", user.displayName);
    setUserSearch("");
    setUserPopoverOpen(false);
  };

  const handleSelectType = (type: AnalystTypeWithServices) => {
    form.setValue("analystTypeId", type.id);
    form.setValue("analystTypeName", type.name);
    const currentAccess = form.getValues("accessAnalystTypes");
    form.setValue(
      "accessAnalystTypes",
      currentAccess.filter((a) => a.analystTypeId !== type.id)
    );
    setTypeSearch("");
    setTypePopoverOpen(false);
  };

  const handleAddAccess = (type: AnalystTypeWithServices) => {
    const currentAccess = form.getValues("accessAnalystTypes");
    form.setValue("accessAnalystTypes", [
      ...currentAccess,
      { analystTypeId: type.id, analystTypeName: type.name },
    ]);
    setAccessSearch("");
    setAccessPopoverOpen(false);
  };

  const handleRemoveAccess = (typeId: string) => {
    const currentAccess = form.getValues("accessAnalystTypes");
    form.setValue(
      "accessAnalystTypes",
      currentAccess.filter((a) => a.analystTypeId !== typeId)
    );
  };

  const handleSave = (data: AnalystRuleFormData) => {
    console.log("Updated data:", data);
    toast.success("Analyst Rule updated successfully");
    setIsEditing(false);
  };

  const handleDelete = () => {
    toast.success("Analyst Rule deleted successfully");
    router.push("/master/analyst-user?tab=rules");
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    form.reset({
      userId: analystRule.userId,
      userName: analystRule.userName,
      analystTypeId: analystRule.analystTypeId,
      analystTypeName: analystRule.analystTypeName,
      accessAnalystTypes: analystRule.accessAnalystTypes,
      status: analystRule.status,
    });
    setUserSearch("");
    setTypeSearch("");
    setAccessSearch("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/master/analyst-user?tab=rules")}
            className="h-9 w-9 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">
                {analystRule.userName}
              </h1>
              <Badge variant={analystRule.status === "Active" ? "default" : "secondary"}>
                {analystRule.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">Analyst Rule Details</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button onClick={form.handleSubmit(handleSave)}>Save Changes</Button>
            </>
          )}
        </div>
      </div>

      {/* Analyst Rule Information Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Analyst Rule Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isEditing ? (
            <Form {...form}>
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* User Selection */}
                  <FormField
                    control={form.control}
                    name="userId"
                    render={() => (
                      <FormItem>
                        <FormLabel>Name (Internal User)</FormLabel>
                        <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                className="w-full justify-start h-10 font-normal"
                              >
                                {selectedUser ? (
                                  <span className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    {form.getValues("userName")}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-2 text-muted-foreground">
                                    <Search className="h-4 w-4" />
                                    Search user...
                                  </span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[--radix-popover-trigger-width] p-0"
                            align="start"
                          >
                            <Command>
                              <CommandInput
                                placeholder="Type to search..."
                                value={userSearch}
                                onValueChange={setUserSearch}
                              />
                              <CommandList>
                                {userSearch.length === 0 ? (
                                  <div className="py-6 text-center text-sm text-muted-foreground">
                                    Start typing to search...
                                  </div>
                                ) : filteredUsers.length === 0 ? (
                                  <CommandEmpty>No user found.</CommandEmpty>
                                ) : (
                                  <CommandGroup>
                                    {filteredUsers.slice(0, 10).map((user) => (
                                      <CommandItem
                                        key={user.id}
                                        value={user.id}
                                        onSelect={() => handleSelectUser(user)}
                                      >
                                        <div className="flex items-center gap-2">
                                          <User className="h-4 w-4 text-muted-foreground" />
                                          <div>
                                            <div className="font-medium">{user.displayName}</div>
                                            <div className="text-xs text-muted-foreground">
                                              {user.email}
                                            </div>
                                          </div>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Analyst Type Selection */}
                  <FormField
                    control={form.control}
                    name="analystTypeId"
                    render={() => (
                      <FormItem>
                        <FormLabel>Analyst Type</FormLabel>
                        <Popover open={typePopoverOpen} onOpenChange={setTypePopoverOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                className="w-full justify-start h-10 font-normal"
                              >
                                {selectedType ? (
                                  <span className="flex items-center gap-2">
                                    <Users className="h-4 w-4 text-muted-foreground" />
                                    {form.getValues("analystTypeName")}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-2 text-muted-foreground">
                                    <Search className="h-4 w-4" />
                                    Search type...
                                  </span>
                                )}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[--radix-popover-trigger-width] p-0"
                            align="start"
                          >
                            <Command>
                              <CommandInput
                                placeholder="Type to search..."
                                value={typeSearch}
                                onValueChange={setTypeSearch}
                              />
                              <CommandList>
                                {typeSearch.length === 0 ? (
                                  <div className="py-6 text-center text-sm text-muted-foreground">
                                    Start typing to search...
                                  </div>
                                ) : filteredTypes.length === 0 ? (
                                  <CommandEmpty>No type found.</CommandEmpty>
                                ) : (
                                  <CommandGroup>
                                    {filteredTypes.map((type) => (
                                      <CommandItem
                                        key={type.id}
                                        value={type.id}
                                        onSelect={() => handleSelectType(type)}
                                      >
                                        <div className="flex items-center gap-2">
                                          <Users className="h-4 w-4 text-muted-foreground" />
                                          <span>{type.name}</span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Status Display */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Status
                    </p>
                    <Badge
                      variant={analystRule.status === "Active" ? "default" : "secondary"}
                    >
                      {analystRule.status}
                    </Badge>
                  </div>
                </div>
              </form>
            </Form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Name
                </p>
                <p className="font-medium">{analystRule.userName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Analyst Type
                </p>
                <p className="font-medium">{analystRule.analystTypeName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Status
                </p>
                <Badge variant={analystRule.status === "Active" ? "default" : "secondary"}>
                  {analystRule.status}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Access Analyst Types Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Access Analyst Types
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              {/* Search Access Type */}
              <Popover open={accessPopoverOpen} onOpenChange={setAccessPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start text-muted-foreground font-normal"
                  >
                    <Search className="mr-2 h-4 w-4" />
                    Search and add access...
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[--radix-popover-trigger-width] p-0"
                  align="start"
                >
                  <Command>
                    <CommandInput
                      placeholder="Type to search..."
                      value={accessSearch}
                      onValueChange={setAccessSearch}
                    />
                    <CommandList>
                      {accessSearch.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          Start typing to search...
                        </div>
                      ) : filteredAccessTypes.length === 0 ? (
                        <CommandEmpty>No type found.</CommandEmpty>
                      ) : (
                        <CommandGroup>
                          {filteredAccessTypes.map((type) => (
                            <CommandItem
                              key={type.id}
                              value={type.id}
                              onSelect={() => handleAddAccess(type)}
                            >
                              <div className="flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                <span>{type.name}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Selected Access Types */}
              {accessTypes.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No additional analyst type access assigned.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {accessTypes.map((access) => (
                    <Badge
                      key={access.analystTypeId}
                      variant="secondary"
                      className="flex items-center gap-1 px-2 py-1"
                    >
                      {access.analystTypeName}
                      <button
                        type="button"
                        onClick={() => handleRemoveAccess(access.analystTypeId)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ) : analystRule.accessAnalystTypes.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No additional analyst type access assigned.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {analystRule.accessAnalystTypes.map((access) => (
                <Badge
                  key={access.analystTypeId}
                  variant="outline"
                  className="text-sm py-1 px-3"
                >
                  {access.analystTypeName}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Analyst Rule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this analyst rule? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
