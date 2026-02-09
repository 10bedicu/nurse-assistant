"use client";

import * as React from "react";
import { LogOut, MessageSquare, Plus } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { ModeToggle } from "./theme-toggle";
import Link from "next/link";
import { API } from "@/utils/api";
import { ChatSerialized } from "@/utils/schemas/chat";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { authTokenAtom } from "@/utils/store";
import { useAtom } from "jotai";
import { useRouter } from "next/navigation";

export function MainSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const [, setAuthToken] = useAtom(authTokenAtom);
  const router = useRouter();

  const { data: chats = [], isLoading: loading } = useQuery({
    queryKey: ["chats"],
    queryFn: async () => {
      const response = await API.chats.list({ limit: 50, offset: 0 });
      return response.results;
    },
  });

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <span className="text-base font-semibold">Chat History</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {loading ? (
            <SidebarMenuItem>
              <SidebarMenuButton disabled>
                <span>Loading chats...</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : chats.length === 0 ? (
            <SidebarMenuItem>
              <SidebarMenuButton disabled>
                <span>No chats yet</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ) : (
            chats.map((chat) => (
              <SidebarMenuItem key={chat.id}>
                <SidebarMenuButton asChild>
                  <Link href={`/chat/${chat.id}`}>
                    <MessageSquare />
                    <span>
                      {chat.messages[0]?.content.slice(0, 30) || "New Chat"}
                      {chat.messages[0]?.content.length > 30 ? "..." : ""}
                    </span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))
          )}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setAuthToken(null);
              router.push("/login");
            }}
          >
            <LogOut className="h-[1.2rem] w-[1.2rem]" />
            <span className="sr-only">Logout</span>
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
