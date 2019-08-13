import json
import re

import math
import dateutil.parser
import datetime
import time
import os
import logging

logger = logging.getLogger()
logger.setLevel(logging.DEBUG)


""" --- Helpers to build responses which match the structure of the necessary dialog actions --- """


def get_slots(intent_request):
    return intent_request['currentIntent']['slots']


def elicit_slot(session_attributes, intent_name, slots, slot_to_elicit, message):
    return {
        'sessionAttributes': session_attributes,
        'dialogAction': {
            'type': 'ElicitSlot',
            'intentName': intent_name,
            'slots': slots,
            'slotToElicit': slot_to_elicit,
            'message': message
        }
    }


def close(session_attributes, fulfillment_state, message):
    response = {
        'sessionAttributes': session_attributes,
        'dialogAction': {
            'type': 'Close',
            'fulfillmentState': fulfillment_state,
            'message': message
        }
    }

    return response


def delegate(session_attributes, slots):
    return {
        'sessionAttributes': session_attributes,
        'dialogAction': {
            'type': 'Delegate',
            'slots': slots
        }
    }


""" --- Helper Functions --- """


def parse_int(n):
    try:
        return int(n)
    except ValueError:
        return float('nan')


def build_validation_result(is_valid, violated_slot, message_content):
    if message_content is None:
        return {
            "isValid": is_valid,
            "violatedSlot": violated_slot,
        }

    return {
        'isValid': is_valid,
        'violatedSlot': violated_slot,
        'message': {'contentType': 'PlainText', 'content': message_content}
    }



def phoneNumberCheck(s):
    Pattern = re.compile("^(?:\+?1[-.●]?)?\(?([0-9]{3})\)?[-.●]?([0-9]{3})[-.●]?([0-9]{4})$")
    return Pattern.match(s) 
    

def validate_dine_suggestion(Location, Cuisine, PhoneNumber):
    location_types = ['new york', 'california', 'bronx', 'ny', 'chicago', 'washington', 'LA', 'los angeles', 'manhattan', 'florida','chicago', \
    'DC', 'connecticut', 'dallas', 'detroit', 'boston', 'queens', 'philidelphia','jersey','NJ','new jersey', 'staten', 'staten island','brooklyn','washington','mumbai']
    if Location is not None and Location.lower() not in location_types:
        return build_validation_result(False,
                                       'Location',
                                       'We do not have {}, would you like a different Location?  '
                                       'Our most popular location is New York'.format(Location))


    Cuisine_types = ['indian', 'mexican', 'chinese', 'indpak', 'german','spanish','italian','burmese','korean','japanese','mediterranean',\
    'persian','french','turkish','labanese','thai','persian']
    if Cuisine is not None and Cuisine.lower() not in Cuisine_types:
        return build_validation_result(False,
                                       'Cuisine',
                                       'We do not have {}, would you like a different Cuisine?  '
                                       'Our most popular Cuisine is Indian'.format(Cuisine))
                                       
    if PhoneNumber is not None and phoneNumberCheck(PhoneNumber) is None:
        # if len(PhoneNumber) == 10:
            
        return build_validation_result(False,
                                      'PhoneNumber',
                                      'Sorry, We could not verify your Phone Number {}'
                                      'Please Enter Valid PhoneNumber '.format(PhoneNumber))
        

    return build_validation_result(True, None, None)





def dine_suggestion(intent_request):
    

    Location = get_slots(intent_request)["Location"]
    Cuisine = get_slots(intent_request)["Cuisine"]
    PhoneNumber = get_slots(intent_request)["PhoneNumber"]
    source = intent_request['invocationSource']

    if source == 'DialogCodeHook':
        slots = get_slots(intent_request)
        # slots['PhoneNumber'] = PhoneNumber

        validation_result = validate_dine_suggestion(Location, Cuisine, PhoneNumber)
        # slots['PhoneNumber'] = str(re.sub(r"[^0-9]+", '', str(PhoneNumber)))
        if not validation_result['isValid']:
            slots[validation_result['violatedSlot']] = None
            return elicit_slot(intent_request['sessionAttributes'],
                               intent_request['currentIntent']['name'],
                               slots,
                               validation_result['violatedSlot'],
                               validation_result['message'])

        
        output_session_attributes = intent_request['sessionAttributes'] if intent_request['sessionAttributes'] is not None else {}

        return delegate(output_session_attributes, get_slots(intent_request))
    return close(intent_request['sessionAttributes'],
                 'Fulfilled',
                 {'contentType': 'PlainText',
                  'content': 'Thanks, your location {} and {} will be emailed to you'.format(Location, Cuisine)})



def dispatch(intent_request):
    """
    Called when the user specifies an intent for this bot.
    """

    logger.debug('dispatch userId={}, intentName={}'.format(intent_request['userId'], intent_request['currentIntent']['name']))

    intent_name = intent_request['currentIntent']['name']

    # Dispatch to your bot's intent handlers
    if intent_name == 'DiningSuggestionsIntent':
        return dine_suggestion(intent_request)

    raise Exception('Intent with name ' + intent_name + ' not supported')


""" --- Main handler --- """


def lambda_handler(event, context):
    """
    Route the incoming request based on intent.
    The JSON body of the request is provided in the event slot.
    """
    # By default, treat the user request as coming from the America/New_York time zone.
    os.environ['TZ'] = 'America/New_York'
    time.tzset()
    logger.debug('event.bot.name={}'.format(event['bot']['name']))

    return dispatch(event)