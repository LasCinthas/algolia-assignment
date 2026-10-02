# Eugenio Menniti submission - Notes

This POC has a very close look and feeling to the original mock-up. This is intended, as I wanted to provide an enhanced experience rather than a complete revolution and make users feel comfortable and familiar immediately. The functionalities that have been implemented are meant to showcase Algolia core capabilities. Other modifications could be added gradually.

A live demo is available at https://algolia-assignment-em.netlify.app/

Status:
[![Netlify Status](https://api.netlify.com/api/v1/badges/c97171d9-ec9d-4816-9e27-36e81a27c84f/deploy-status)](https://app.netlify.com/projects/algolia-assignment-em/deploys)

All Algolia settings have been changed directly on the dashboard for easy and quick experimentation, rather than on the code. As part of this POC, I am not following the principles of configuration as code.

The project extends the existing starting project and adds new things on top of it. Sometimes, changes have been made to support small improvements or resolve technical issues.

Two scripts have been created. One to perform a check of the essentials prerequisites that the datasets should have and another one to merge the datasets and upload the records to the index.
These scripts could be extended, especially the one that performs the check, with additional data integrity analysis, numeric values bounds analysis, data format verifications etc. As of now, the assumption is that the data respects all these conditions, including the fact that the dataset doesn't contain the same restaurant in two different objectIDs.

A js file has been added for purely cosmetic purposes. This file provides a typing animatino to the searchbox when used by the index. Since this was not related to the actual logic, I decided to put it in a separate file and keep the index as clean and utilitarian as possible.
Another js file is used for the geolocation utilities implementation.

Some of the technical challenges encountered are listed at the end of the index.js file. The Parcel related problems could be investigated more, in order to be able to use the same syntax for importing the modules as written in the official Algolia documentation but for this POC I solved the issue by using an adapted importing mechanism, rather than spending time on something not strictly linked to the overall objectives and goals.

AI assistance has been used to quickly edit the CSS, support the troubleshooting, syntax review and suggestions while typing. All decisions, choice of the components, structures and architecture are made indipendetly and peer-reviewed with the assistance of the AI with the only purpose of speeding-up the development.

The dataset doesn't contain restaurants near my location, so I changed the coordinates of one of them in order to validate that the gelocation ranking is working. The location of the user is determined using their IP, and they have the possibility to use the precise location clicking a button. For this POC, there is no control on the distance between the user and the restaurant, and this criteria is only used for raking the results and not for filtering what is shown and what is not shown. The geolocation using the IP acts as primary and fallback option, while the exact position is an optional choice manually made by the user.

The cuisine type has been configured as a filter, by configuring the related facet. In order to provide a better experience, the frontend ranks the visualization by popularity of the cuisine type. In this way, the users can browse the types with the highest number of options but they keep the possibility to show more options or search manually, providing maximum flexibility while proposing meaningful selectors first.

Since the users might be looking for restaurants in a city different than their actual one, the searchbox allows to search by city. This option, combined with the filtering, doesn't limit the users to browsing only the restaurants from their location and avoid having to load more and more results to find what they are really looking for. As part of the hits visualization, the city is showed when it's not included in the neighborood, which is a very common pattern in the dataset.

Basic insights have been enabled. These tracks if the user view the hits and if he loads more results, if the user click on a hit (even if there is no behavior to show the restaurant details or anything else as part of this POC), and interacts with the filters. This data could be used later to understand the filters that are actually used by the users and which one could be removed and replaced, if the queries are returning meaningful results and if the user is quickly finding what he's looking for or not. Further improvements could be made with decisions based on this data. Further development could include a full conversion, for example when the user reserves a table.

The dataset contains all invalid images url. As part of this POC, the code fully supports this and shows the default image provided by OpenTable. When a dataset with valid images is provided, the pictures will be correctly displayed.

As part of the hits, the decision was about using an infinite scroll with a button rather than a traditional pagination. Since the user might be considering various options and want to quickly jump to one to the other, this seemed the quickest way to provide this feature to them.

For the filters, in addition to the cuisine type that is one of the most obvious ways the user might want to filter the results, price, rating and dining style have been added as well. Price is an important factor, and this is why it's the second to be showed and it keeps the same values present in the dataset, since they are consistent. In the hit cards, the price is also always shown, with a shorter symbolic visualization. The rating is the third provided filtering, which might be useful for users when they want to find a restaurant and make sure that is approved by other users. Finally, the dining style with all his options is shown at the end, to make sure that the user can combine all the other filtering conditions to find the dining experience he's really looking for. This combination will grant the possibility to the users that already know what they are looking for a quick way to put in place a proper filtering strategy instead of scrolling the results for a long time.

Phone numbers, precise addresses, payment options, reserve url and postal codes have been omitted for now from the index. These might be useful later when the restaurant details are implemented, but are not considered essential search conditions for this POC implementation.