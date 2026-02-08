// Events received from other services for notification purposes

export interface ReservationRequestCreatedEvent {
  eventId: string;
  eventType: 'reservation.request.created';
  timestamp: string;
  payload: {
    requestId: string;
    accommodationId: string;
    accommodationName: string;
    hostId: string;
    guestId: string;
    guestName: string;
    startDate: string;
    endDate: string;
    numberOfGuests: number;
    price: number;
  };
}

export interface ReservationRequestRespondedEvent {
  eventId: string;
  eventType: 'reservation.request.responded';
  timestamp: string;
  payload: {
    requestId: string;
    accommodationId: string;
    accommodationName: string;
    hostId: string;
    guestId: string;
    status: 'APPROVED' | 'REJECTED';
    startDate: string;
    endDate: string;
  };
}

export interface ReservationCancelledEvent {
  eventId: string;
  eventType: 'reservation.cancelled';
  timestamp: string;
  payload: {
    reservationId: string;
    accommodationId: string;
    accommodationName: string;
    hostId: string;
    guestId: string;
    guestName: string;
    startDate: string;
    endDate: string;
  };
}

export interface HostRatedEvent {
  eventId: string;
  eventType: 'rating.host.created';
  timestamp: string;
  payload: {
    ratingId: string;
    hostId: string;
    guestId: string;
    guestName: string;
    rating: number;
    comment?: string;
  };
}

export interface AccommodationRatedEvent {
  eventId: string;
  eventType: 'rating.accommodation.created';
  timestamp: string;
  payload: {
    ratingId: string;
    accommodationId: string;
    accommodationName: string;
    hostId: string;
    guestId: string;
    guestName: string;
    rating: number;
    comment?: string;
  };
}
