import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../card";
import { Chip } from "../badge";
import { Avatar, AvatarFallback, AvatarImage } from "../avatar";
import { Users, MapPin, Clock } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const UpcomingMeetings = ({ meetings = [] }) => {
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">Cuộc họp sắp tới</CardTitle>
        <a href="/meetings" className="text-sm text-blue-600 hover:underline">
          Xem tất cả
        </a>
      </CardHeader>
      <CardContent>
        {meetings.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            Không có cuộc họp nào sắp tới
          </div>
        ) : (
          <div className="space-y-4">
            {meetings.map((meeting) => (
              <div
                key={meeting._id}
                className="flex flex-col space-y-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-lg">{meeting.title}</h3>
                  <Badge variant={meeting.status === 'upcoming' ? 'default' : 'secondary'}>
                    {formatDistanceToNow(new Date(meeting.startTime), { 
                      addSuffix: true,
                      locale: vi 
                    })}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center">
                    <Clock className="w-4 h-4 mr-2" />
                    {new Date(meeting.startTime).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit'})}
                  </div>
                  
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-2" />
                    {meeting.room ? meeting.room.name : (meeting.location || 'Chưa có địa điểm')}
                  </div>
                  
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    {meeting.participants?.length || 0} người tham gia
                  </div>
                </div>

                <div className="flex -space-x-2">
                  {meeting.participants?.slice(0, 4).map((participant) => (
                    <Avatar key={participant._id} className="border-2 border-white">
                      <AvatarImage src={participant.avatar} />
                      <AvatarFallback>
                        {participant.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {meeting.participants?.length > 4 && (
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 border-2 border-white">
                      <span className="text-xs font-medium">
                        +{meeting.participants.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingMeetings; 