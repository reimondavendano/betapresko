'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Box, Wrench, Asterisk, Building2, MapPinHouse, Settings, Blocks } from 'lucide-react'
import AdminBrand from './AdminBrand'
import AdminHP from './AdminHP'
import AdminTypes from './AdminTypes'
import AdminCity from './AdminCity'
import AdminBarangay from './AdminBarangay'
import AdminServices from './AdminServices'
import AdminBlockedDates from './AdminBlockedDates'

export default function AdminMasterData() {
  return (
    <div className="h-full">
      <Tabs defaultValue="brands" className="w-full h-full" orientation="vertical">
        <div className="grid grid-cols-12 gap-4 h-full">
          <div className="col-span-12 md:col-span-3 h-full">
            <div className="h-full rounded-xl p-2 bg-gradient-to-br from-gray-200 via-[#8FB6BA] to-[#fff] shadow">
            <TabsList
              className="
                flex flex-col gap-2 w-full bg-transparent p-0 h-full md:h-auto
              "
            >
              <TabsTrigger
                value="brands"
                className="justify-start gap-2 w-full rounded-lg bg-white/80 hover:bg-white text-gray-700 
                  data-[state=active]:bg-white data-[state=active]:text-gray-500 text-base
                  md:w-full"
              >
                <Box size={18} /> Brands
              </TabsTrigger>
              <TabsTrigger
                value="horsepower"
                className="justify-start gap-2 w-full rounded-lg bg-white/80 hover:bg-white text-gray-700 
                  data-[state=active]:bg-white data-[state=active]:text-gray-500 text-base
                  md:w-full"
              >
                <Wrench size={18} /> Horsepower
              </TabsTrigger>
              <TabsTrigger
                value="types"
                className="justify-start gap-2 w-full rounded-lg bg-white/80 hover:bg-white text-gray-700 
                  data-[state=active]:bg-white data-[state=active]:text-gray-500 text-base
                  md:w-full"
              >
                <Asterisk size={18} /> AC Types
              </TabsTrigger>
              <TabsTrigger
                value="cities"
                className="justify-start gap-2 w-full rounded-lg bg-white/80 hover:bg-white text-gray-700 
                  data-[state=active]:bg-white data-[state=active]:text-gray-500 text-base
                  md:w-full"
              >
                <Building2 size={18} /> Cities
              </TabsTrigger>
              <TabsTrigger
                value="barangays"
                className="justify-start gap-2 w-full rounded-lg bg-white/80 hover:bg-white text-gray-700 
                  data-[state=active]:bg-white data-[state=active]:text-gray-500 text-base
                  md:w-full"
              >
                <MapPinHouse size={18} /> Barangays
              </TabsTrigger>
              <TabsTrigger
                value="services"
                className="justify-start gap-2 w-full rounded-lg bg-white/80 hover:bg-white text-gray-700 
                  data-[state=active]:bg-white data-[state=active]:text-gray-500 text-base
                  md:w-full"
              >
                <Settings size={18} /> Services
              </TabsTrigger>
              <TabsTrigger
                value="blocked"
                className="justify-start gap-2 w-full rounded-lg bg-white/80 hover:bg-white text-gray-700 
                  data-[state=active]:bg-white data-[state=active]:text-gray-500 text-base
                  md:w-full"
              >
                <Blocks size={18} /> Blocked Dates
              </TabsTrigger>
            </TabsList>

            </div>
          </div>
          <div className="col-span-12 md:col-span-9 h-full">
            <div className="h-full bg-white rounded-xl shadow">
              <TabsContent value="brands" className="m-0 h-full"><AdminBrand /></TabsContent>
              <TabsContent value="horsepower" className="m-0 h-full"><AdminHP /></TabsContent>
              <TabsContent value="types" className="m-0 h-full"><AdminTypes /></TabsContent>
              <TabsContent value="cities" className="m-0 h-full"><AdminCity /></TabsContent>
              <TabsContent value="barangays" className="m-0 h-full"><AdminBarangay /></TabsContent>
              <TabsContent value="services" className="m-0 h-full"><AdminServices /></TabsContent>
              <TabsContent value="blocked" className="m-0 h-full"><AdminBlockedDates /></TabsContent>
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  )
}


