"use client";

import * as React from "react";
import { MessageSquare, Plus } from "lucide-react";

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

export function MainSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
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
        <ModeToggle />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
