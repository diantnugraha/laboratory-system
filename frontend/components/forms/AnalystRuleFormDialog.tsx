import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { X, Search, User, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { analystRuleSchema, AnalystRuleFormData } from "@/lib/schemas";
import {
  internalUsers,
  analystTypesWithServices,
  InternalUserOption,
  AnalystTypeWithServices,
} from "@/data/analystUserData";

interface AnalystRuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AnalystRuleFormDialog({
  open,
  onOpenChange,
  onSuccess,
}: AnalystRuleFormDialogProps) {
  const [userSearch, setUserSearch] = useState("");
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const [typeSearch, setTypeSearch] = useState("");
  const [typePopoverOpen, setTypePopoverOpen] = useState(false);
  const [accessSearch, setAccessSearch] = useState("");
  const [accessPopoverOpen, setAccessPopoverOpen] = useState(false);

  const form = useForm<AnalystRuleFormData>({
    resolver: zodResolver(analystRuleSchema),
    defaultValues: {
      userId: "",
      userName: "",
      analystTypeId: "",
      analystTypeName: "",
      accessAnalystTypes: [],
      status: "Active",
    },
  });

  const selectedUser = form.watch("userId");
  const selectedType = form.watch("analystTypeId");
  const accessTypes = form.watch("accessAnalystTypes");

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
    // Remove from access if selected as main type
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

  const onSubmit = (data: AnalystRuleFormData) => {
    console.log("Form data:", data);
    toast.success("Analyst Rule created successfully");
    form.reset();
    onOpenChange(false);
    onSuccess?.();
  };

  const handleClose = () => {
    form.reset();
    setUserSearch("");
    setTypeSearch("");
    setAccessSearch("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Analyst Rule</DialogTitle>
          <DialogDescription>
            Create a new analyst rule with user assignment and access permissions.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Internal User Selection */}
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
                              Search internal user...
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
                          placeholder="Type to search user..."
                          value={userSearch}
                          onValueChange={setUserSearch}
                        />
                        <CommandList>
                          {userSearch.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              Start typing to search users...
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
                              Search analyst type...
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
                          placeholder="Type to search analyst type..."
                          value={typeSearch}
                          onValueChange={setTypeSearch}
                        />
                        <CommandList>
                          {typeSearch.length === 0 ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              Start typing to search...
                            </div>
                          ) : filteredTypes.length === 0 ? (
                            <CommandEmpty>No analyst type found.</CommandEmpty>
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

            {/* Access Analyst Types */}
            <div className="space-y-3">
              <FormLabel>Access Analyst Type (Optional)</FormLabel>
              <p className="text-xs text-muted-foreground">
                Assign additional analyst types this user can view or access.
              </p>

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
                        <CommandEmpty>No analyst type found.</CommandEmpty>
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
              {accessTypes.length > 0 && (
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit">Create Analyst Rule</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
