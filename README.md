# Eugenio Menniti submission - Notes

This POC has a very close look and feeling to the original mock-up. This is intended, as I wanted to provide an enhanced experience rather than a complete revolution and make users feel comfortable and familiar immediately. The functionalities that have been implemented are meant to showcase Algolia core capabilities. Other modifications could be added gradually.

A live demo is available at URL_HERE

All Algolia settings have been changed directly on the dashboard for easy and quick experimentation, rather than on the code. As part of this POC, I am not following the principles of configuration as code.

The project extends the existing starting project and adds new things on top of it. Sometimes, changes have been made to support small improvements or resolve technical issues.

Two scripts have been created. One to perform a check of the essentials prerequisites that the datasets should have and another one to merge the datasets and upload the records to the index.
These scripts could be extended, especially the one that performs the check, with additional data integrity analysis, numeric values bounds analysis, data format verifications etc. As of now, the assumption is that the data respects all these conditions.

A js file has been added for purely cosmetic purposes. This file provides a typing animatino to the searchbox when used by the index. Since this was not related to the actual logic, I decided to put it in a separate file and keep the index as clean and utilitarian as possible.

Some of the technical challenges encountered are listed at the end of the index.js file. The Parcel related problems could be investigated more, in order to be able to use the same syntax for importing the modules as written in the official Algolia documentation but for this POC I solved the issue by using an adapted importing mechanism, rather than spending time on something not strictly linked to the overall objectives and goals.

AI assistance has been used to quickly edit the CSS, support the troubleshooting, syntax review and suggestions while typing. All decisions, choice of the components, structures and architecture are made indipendetly and peer-reviewed with the assistance of the AI with the only purpose of speeding-up the development.

The dataset doesn't contain restaurants near my location, so I changed the coordinates of one of them in order to validate that the gelocation ranking is working. The location of the user is determined using their IP, and they have the possibility to use the precise location clicking a button. For this POC, there is no control on the distance between the user and the restaurant, and this criteria is only used for raking the results and not for filtering what is shown and what is not shown. The geolocation using the IP acts as primary and fallback option, while the exact position is an optional choice manually made by the user.

The cuisine type has been configured as a filter, by configuring the related facet. In order to provide a better experience, the frontend ranks the visualization by popularity of the cuisine type. In this way, the users can browse the types with the highest number of options but they keep the possibility to show more options or search manually, providing maximum flexibility.

Since the users might be looking for restaurants in a city different than their actual one, the searchbox allows to search by city. This option, combined with the filtering, doesn't limit the users to browsing only the restaurants from their location and avoid having to load more and more results to find what they are really looking for. As part of the hits visualization, the city is not showed. Instead, only the neighborhood is showed, assuming that the user would be familiar with the city and can recognize if it's what he's looking for. The hit card could be improved, to show also the city, but for this basic implementation it's enough for showcasing the search options.