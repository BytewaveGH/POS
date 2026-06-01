"use client"


import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export default function SiteSetup() {
    const [type, setType] = useState("store");
    const [storagePlan, setStoragePlan] = useState("basic");

    const [siteType, setSiteType] = useState("store");
    const [layoutStyle, setLayoutStyle] = useState("modern");
    const [siteName, setSiteName] = useState("");
    const domain = "izzuki.app";
    const layoutOptions = ["modern", "classic", "minimal", "grid"];

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-6">
            <h1 className="text-3xl font-bold">Set Up Your Site</h1>

            {/* Step 1: Choose Site Type */}
            <div>
                <Label className="mb-2 block">What are you building?</Label>
                <Tabs defaultValue="store" onValueChange={(val) => setType(val)}>
                    <TabsList>
                        <TabsTrigger value="store">Store</TabsTrigger>
                        <TabsTrigger value="hostel">Hostel</TabsTrigger>
                        <TabsTrigger value="custom">Custom</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Step 2: General Info */}
            <Card>
                <CardContent className="p-4 space-y-4">
                    <Label>Business/Site Name</Label>
                    <Input placeholder="e.g. CozyMart or BlueHostel" />

                    <Label>Short Description</Label>
                    <Textarea placeholder="A warm and inviting space for customers or guests." />

                    <Label>Tagline</Label>
                    <Input placeholder="e.g. Your comfort is our priority." />
                </CardContent>
            </Card>

            {/* Step 3: Theme & Branding */}
            <Card>
                <CardContent className="p-4">
                    <h2 className="font-semibold text-lg mb-2">Setup Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column: Modules */}
                        <div>
                            <h3 className="font-medium text-base mb-2">Modules</h3>
                            {type === "store" && (
                                <div className="space-y-4">
                                    <Label className="flex justify-between items-center">
                                        Discount / Promotion Codes <Switch defaultChecked />
                                    </Label>
                                    <Label className="flex justify-between items-center">
                                        Product Listings <Switch defaultChecked />
                                    </Label>
                                    <Label className="flex justify-between items-center">
                                        Product Showcase Ad <Switch defaultChecked />
                                    </Label>
                                    <Label className="flex justify-between items-center">
                                        Cart & Checkout <Switch defaultChecked />
                                    </Label>

                                    <Label className="flex justify-between items-center">
                                        Invoicing System <Switch defaultChecked />
                                    </Label>
                                    <Label className="flex justify-between items-center">
                                        Sales Analytics <Switch defaultChecked />
                                    </Label>
                                    <Label className="flex justify-between items-center">
                                        Order Management <Switch defaultChecked />
                                    </Label>
                                    <Label className="flex justify-between items-center">
                                        Social Media Integrations<Switch defaultChecked />
                                    </Label>
                                    <Label className="flex justify-between items-center">
                                        Inventory System <Switch />
                                    </Label>
                                    <Label className="flex justify-between items-center">
                                        Payment Gateway <Switch defaultChecked />
                                    </Label>
                                    <Label className="flex justify-between items-center">
                                        Site Configurations <Switch defaultChecked />
                                    </Label>
                                </div>
                            )}
                            {type === "hostel" && (
                                <div className="space-y-4">
                                    <Label className="flex justify-between items-center">
                                        Room Listings <Switch defaultChecked />
                                    </Label>
                                    <Label className="flex justify-between items-center">
                                        Booking Calendar <Switch />
                                    </Label>
                                    <Label className="flex justify-between items-center">
                                        Guest Reviews <Switch defaultChecked />
                                    </Label>
                                    <Label className="flex justify-between items-center">
                                        Availability Settings <Switch />
                                    </Label>
                                    <Label className="flex justify-between items-center">
                                        Payment Integration <Switch />
                                    </Label>
                                    <Label className="flex justify-between items-center">
                                        Cleaning Schedule <Switch />
                                    </Label>
                                    <Label className="flex justify-between items-center">
                                        Guest Verification <Switch />
                                    </Label>
                                    <Label className="flex justify-between items-center">
                                        Booking Analytics <Switch />
                                    </Label>
                                    <Label className="flex justify-between items-center">
                                        Email Confirmations <Switch />
                                    </Label>
                                    <Label className="flex justify-between items-center">
                                        Staff/Manager Access <Switch />
                                    </Label>
                                    <Label className="flex justify-between items-center">
                                        Site Configurations <Switch defaultChecked />
                                    </Label>
                                </div>

                            )}
                        </div>

                        {/* Right Column: Weekly Schedule */}
                        <div>
                            <h3 className="font-medium text-base mb-2">Weekly Schedule</h3>
                            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                                {[
                                    "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
                                ].map((day) => (
                                    <div key={day} className="flex items-center gap-4">
                                        <Label className="w-24">{day}</Label>
                                        <Input type="time" className="w-28" placeholder="Open" />
                                        <span className="text-sm">to</span>
                                        <Input type="time" className="w-28" placeholder="Close" />
                                    </div>
                                ))}
                            </div>
                            <div className="mt-4">
                                <Label htmlFor="location">Location</Label>
                                <Input
                                    type="text"
                                    id="location"
                                    placeholder="e.g. 123 Main St, City"
                                    className="mt-1 w-full"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Step 4: Storage Plan */}
            <div>
                <Label className="mb-2 block">Storage Plan</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {["basic", "standard", "premium"].map((plan, index) => (
                        <Card
                            key={plan}
                            onClick={() => setStoragePlan(plan)}
                            className={cn(
                                "cursor-pointer p-4 border-2 transition-all",
                                storagePlan === plan
                                    ? "border-green-500 shadow-lg"
                                    : "border-muted hover:border-green-300"
                            )}
                        >
                            <div className="text-center font-semibold capitalize mb-2 text-lg">
                                {plan}
                            </div>
                            <div className="text-sm text-center text-muted-foreground">
                                {plan === "basic" && "5 GB storage, 1 admin user"}
                                {plan === "standard" && "50 GB storage, 5 users, email support"}
                                {plan === "premium" && "200 GB storage, unlimited users, priority support"}
                            </div>
                        </Card>
                    ))}
                </div>
            </div>


            <div>
                <Label>Site Name</Label>
                <Input
                    placeholder="e.g. mycoolsite"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                />
                {siteName && <p className="text-sm text-muted">Your site will be available at: <span className="font-medium">{siteName}.{domain}</span></p>}
            </div>

            <div>
                <Label className="mb-2 block">Layout Style</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {layoutOptions.map((layout, index) => (
                        <Card
                            key={layout}
                            onClick={() => setLayoutStyle(layout)}
                            className={cn(
                                "cursor-pointer p-2 border-2 transition-all",
                                layoutStyle === layout
                                    ? "border-blue-500 shadow-lg"
                                    : "border-muted hover:border-blue-300"
                            )}
                        >
                            <img
                                src={`https://picsum.photos/seed/${layout + index}/300/180`}
                                alt={`${layout} preview`}
                                className="rounded-lg w-full h-32 object-cover mb-2"
                            />
                            <div className="text-center font-medium capitalize">
                                {layout.replace("-", " ")}
                            </div>
                        </Card>
                    ))}
                </div>
            </div>




            <div className="text-right">
                <Button>Continue to Navigation</Button>
            </div>
        </div>
    );
}
